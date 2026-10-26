#!/usr/bin/env python3
"""Apply only the reviewed 59-file union. Default/check mode never writes."""
import argparse
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import tempfile

MAIN = Path('/Users/jeonggyuju/Project_folder/KeepBoard').resolve()
REPORTS = MAIN / 'docs/lightweight-recognition/integration'
UNION = REPORTS / 'union-preflight-v2.json'
UNION_SHA = 'a837c540bfb95cfeb8ed68c8bec157b2e508afd23701a48f7d69ac40d5192e73'
CHECKED = REPORTS / 'round2/source-before.json'
CHECKED_SHA = 'a934eaff3fd58142657348773614b095f577a24f1009648c373ad656e40cff76'
CHECKED_FILE_SHA = '8c2e58cb68970435d0f884442a81a88814821412b2d573fa1d4fcd97ac29b3fe'
STAGE = Path('/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-lightweight-recognition-vyzn4xm9/app').resolve()
SOURCE_DIRS = ('src', 'server', 'shared', 'gamepacks', 'gateway', 'workflows',
               'api', 'tools', 'tests', 'game-photo-definitions')
ROOT_FILES = ('package.json', 'package-lock.json', 'tsconfig.json',
              'tsconfig.node.json', 'vite.config.ts', 'vercel.json',
              'index.html', '.gitignore')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(root, rel):
    parts = PurePosixPath(rel).parts
    if not parts or rel.startswith('/') or '..' in parts or '\\' in rel:
        raise ValueError('Unsafe relative path: ' + rel)
    p = root
    for part in parts:
        p = p / part
        if p.is_symlink():
            raise ValueError('Symlink is not allowed: ' + rel)
    return p


def digest(path):
    if not path.exists():
        return None
    if not path.is_file() or path.is_symlink():
        raise ValueError('Expected a regular file: ' + str(path))
    return sha(path.read_bytes())


def source_inventory():
    """Read only named source roots, never .keepboard, env, uploads or docs."""
    result = {}
    for name in SOURCE_DIRS:
        root = MAIN / name
        if not root.exists():
            continue
        for base, dirs, files in os.walk(root, followlinks=False):
            dirs[:] = sorted(d for d in dirs if d not in
                             ('node_modules', '__pycache__', '.git', '.keepboard',
                              'uploads', 'userdata', 'raw', 'dist', 'build')
                             and not (Path(base) / d).is_symlink())
            for name2 in sorted(files):
                p = Path(base) / name2
                if p.is_symlink() or name2.startswith('.env'):
                    continue
                if p.is_file():
                    result[p.relative_to(MAIN).as_posix()] = digest(p)
    for name in ROOT_FILES:
        p = MAIN / name
        if p.exists():
            result[name] = digest(p)
    return result


def preflight():
    union_bytes = UNION.read_bytes()
    checked_bytes = CHECKED.read_bytes()
    if sha(union_bytes) != UNION_SHA or sha(checked_bytes) != CHECKED_FILE_SHA:
        raise ValueError('Frozen union or round2 source-map SHA changed')
    union, checked = json.loads(union_bytes), json.loads(checked_bytes)
    if sha(json.dumps(checked, sort_keys=True, separators=(',', ':')).encode()) != CHECKED_SHA:
        raise ValueError('Canonical round2 source-map SHA changed')
    if Path(union['stageRoot']).resolve() != STAGE or Path(union['sharedRoot']).resolve() != MAIN:
        raise ValueError('Root mismatch')
    rows = union['files']
    paths = {row['path'] for row in rows}
    if len(rows) != 59 or len(paths) != 59:
        raise ValueError('Expected exactly 59 unique paths')
    if sum(row['initialSharedPreimageSHA256'] is not None for row in rows) != 18:
        raise ValueError('Expected exactly 18 original files')
    prepared = []
    for row in rows:
        rel, final = row['path'], row['finalStagePostSHA256']
        if PurePosixPath(rel).parts[0] not in SOURCE_DIRS:
            raise ValueError('Unexpected product path: ' + rel)
        src, dst = safe_path(STAGE, rel), safe_path(MAIN, rel)
        content = src.read_bytes()
        if sha(content) != final or checked.get(rel) != final or row['checkedRunSourceSHA256'] != final:
            raise ValueError('Stage/union/round2 mismatch: ' + rel)
        current, initial = digest(dst), row['initialSharedPreimageSHA256']
        if current != final and current != initial:
            raise ValueError('Main preimage conflict: ' + rel)
        prepared.append((row, content, current))
    return prepared


def private_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--apply', action='store_true')
    parser.add_argument('--approved-script-sha')
    args = parser.parse_args()
    script_sha = sha(Path(__file__).read_bytes())
    if args.apply and args.approved_script_sha != script_sha:
        raise ValueError('Apply requires the reviewed exact script SHA')
    prepared = preflight()
    if not args.apply:
        print(json.dumps({'status': 'PREFLIGHT_PASS_NO_WRITES', 'files': 59,
                          'alreadyFinal': sum(c == r['finalStagePostSHA256'] for r, _, c in prepared),
                          'scriptSHA256': script_sha, 'unionSHA256': UNION_SHA}))
        return

    # Serializes this exact apply tool; does not touch running servers or Git.
    lock_fd = os.open(REPORTS / 'main-apply.lock', os.O_RDWR | os.O_CREAT, 0o600)
    with os.fdopen(lock_fd, 'r+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        prepared = preflight()
        before = source_inventory()
        backup = Path(tempfile.mkdtemp(prefix='keepboard-union-v2-backup-'))
        os.chmod(backup, 0o700)
        receipt = {'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                   'scriptSHA256': script_sha, 'unionSHA256': UNION_SHA,
                   'round2SourceMapSHA256': CHECKED_SHA, 'backupRoot': str(backup),
                   'backupFiles': [], 'applied': [], 'alreadyFinal': [], 'status': 'STARTED'}
        receipt_path = REPORTS / ('main-apply-' + backup.name.removeprefix('keepboard-union-v2-backup-') + '.json')
        try:
            # Complete backups and all checks before the first product write.
            for row, _, current in prepared:
                if row['initialSharedPreimageSHA256'] is None or current is None:
                    continue
                rel = row['path']
                data = safe_path(MAIN, rel).read_bytes()
                if sha(data) != current:
                    raise ValueError('Changed during backup: ' + rel)
                private_write(backup / 'files' / rel, data)
                receipt['backupFiles'].append({'path': rel, 'SHA256': current})
            private_write(backup / 'backup-manifest.json',
                          (json.dumps(receipt, indent=2) + '\n').encode())
            preflight()
            for row, content, expected in prepared:
                rel, final = row['path'], row['finalStagePostSHA256']
                dst = safe_path(MAIN, rel)
                if digest(dst) != expected:
                    raise ValueError('Immediate preimage conflict: ' + rel)
                if expected == final:
                    receipt['alreadyFinal'].append(rel)
                    continue
                dst.parent.mkdir(parents=True, exist_ok=True)
                safe_path(MAIN, rel)
                if expected is None:
                    # Exclusive creation cannot overwrite a concurrently created file.
                    fd = os.open(dst, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
                    with os.fdopen(fd, 'wb') as stream:
                        stream.write(content)
                        stream.flush()
                        os.fsync(stream.fileno())
                else:
                    mode_bits = stat.S_IMODE(dst.stat().st_mode)
                    fd, temporary = tempfile.mkstemp(prefix='.union-v2-', dir=dst.parent)
                    try:
                        with os.fdopen(fd, 'wb') as stream:
                            stream.write(content)
                            stream.flush()
                            os.fsync(stream.fileno())
                        os.chmod(temporary, mode_bits)
                        if digest(safe_path(MAIN, rel)) != expected:
                            raise ValueError('Preimage changed before atomic replace: ' + rel)
                        os.replace(temporary, dst)
                    finally:
                        if os.path.exists(temporary):
                            os.unlink(temporary)
                if digest(dst) != final:
                    raise ValueError('Postimage mismatch: ' + rel)
                receipt['applied'].append({'path': rel, 'preSHA256': expected, 'postSHA256': final})
            targets = {r['path'] for r, _, _ in prepared}
            after = source_inventory()
            outside = sorted(p for p in set(before) | set(after)
                             if p not in targets and before.get(p) != after.get(p))
            post_errors = [r['path'] for r, _, _ in prepared
                           if digest(safe_path(MAIN, r['path'])) != r['finalStagePostSHA256']]
            receipt.update(outsideSourceFilesChecked=len(set(before) - targets),
                           outsideSourceChanges=outside, postErrors=post_errors,
                           verifiedPostFiles=59)
            if outside or post_errors:
                raise ValueError('Post-apply source verification failed; inspect receipt')
            receipt['status'] = 'APPLIED_AND_VERIFIED'
        except Exception as exc:
            receipt['status'] = 'STOPPED_NO_AUTOMATIC_ROLLBACK'
            receipt['error'] = str(exc)
            raise
        finally:
            receipt['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
            print(json.dumps({'status': receipt['status'], 'receipt': str(receipt_path),
                              'receiptSHA256': digest(receipt_path), 'backupRoot': str(backup),
                              'applied': len(receipt['applied']), 'alreadyFinal': len(receipt['alreadyFinal'])}))


if __name__ == '__main__':
    run()
