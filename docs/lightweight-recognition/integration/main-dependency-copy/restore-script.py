#!/usr/bin/env python3
"""Copy the verified resolved dependency tree, then preserve and replace main deps."""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile

MAIN=Path('/Users/jeonggyuju/Project_folder/KeepBoard')
STAGE=Path('/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-lightweight-recognition-vyzn4xm9/app')
REPORTS=MAIN/'docs/lightweight-recognition/integration'
EXPECTED={'package.json':'5a572bdbe31a9cdbd2991b8abccd144bf87c0d6fc88e1eb14c77c3e336817cc5',
          'package-lock.json':'2aa0e9b17f47ffa2530dab3cacab9072edcb302264851957a8231dad48f7769a'}


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def inventory(root):
    result={}
    for base,dirs,files in os.walk(root,followlinks=False):
        for name in sorted(dirs+files):
            p=Path(base)/name
            rel=p.relative_to(root).as_posix()
            if p.is_symlink():
                target=os.readlink(p)
                if os.path.isabs(target) or not p.resolve().is_relative_to(root):
                    raise RuntimeError('Dependency symlink escapes tree: '+rel)
                result[rel]={'symlink':target}
            elif p.is_file():
                result[rel]={'SHA256':sha(p)}
            elif p.is_dir():
                result[rel]={'directory':True}
            else:
                raise RuntimeError('Unexpected dependency entry: '+rel)
    return result


def map_sha(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def run():
    out=REPORTS/'main-dependency-copy'
    out.mkdir(exist_ok=False)
    spec=importlib.util.spec_from_file_location('apply_union',REPORTS/'apply-union-v2.py')
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for root in [MAIN,STAGE]:
        for name,value in EXPECTED.items():
            if sha(root/name)!=value:
                raise RuntimeError('Package/lock preimage mismatch')
    source=(STAGE/'node_modules').resolve()
    protected_inode=source.stat().st_ino
    original=MAIN/'node_modules'
    if original.is_symlink() or not original.is_dir():
        raise RuntimeError('Expected real existing main dependencies')
    original_inode=original.stat().st_ino
    before_source=module.source_inventory()
    private=Path(tempfile.mkdtemp(prefix='keepboard-verified-main-deps-'))
    os.chmod(private,0o700)
    copied=private/'node_modules'
    backup=private/'node_modules-before'
    receipt={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
             'sourceDependencyRoot':str(source),'privateRoot':str(private),
             'backupRoot':str(backup),'packageSHA256':EXPECTED,
             'scriptSHA256':sha(Path(__file__)),'status':'COPYING','swapped':False,
             'newInstallations':0,'modelRequests':0,'productSourceWrites':0}
    try:
        baseline=inventory(source)
        shutil.copytree(source,copied,symlinks=True)
        clone=inventory(copied)
        if baseline!=clone or inventory(source)!=baseline:
            raise RuntimeError('Dependency copy/source changed; do not swap')
        receipt.update(dependencyMapSHA256=map_sha(baseline),
                       dependencyEntries=len(baseline),
                       dependencyFiles=sum('SHA256' in row for row in baseline.values()),
                       dependencySymlinks=sum('symlink' in row for row in baseline.values()))
        locked=json.loads((MAIN/'package-lock.json').read_text())['packages']
        mismatches=[]
        checked=0
        for path,meta in locked.items():
            if not path.startswith('node_modules/') or not meta.get('version'):
                continue
            p=private/path/'package.json'
            if not p.is_file():
                continue  # Includes locked binaries for other platforms.
            checked+=1
            if json.loads(p.read_text()).get('version')!=meta['version']:
                mismatches.append(path)
        receipt['installedLockPathsChecked']=checked
        receipt['installedLockVersionMismatches']=mismatches
        for name,version in [('@vercel/blob','2.8.2'),('workflow','5.2.3')]:
            if json.loads((copied/name/'package.json').read_text())['version']!=version:
                raise RuntimeError('Required exact version mismatch')
        if mismatches or module.source_inventory()!=before_source:
            raise RuntimeError('Lock-version/source mismatch; do not swap')
        for root in [MAIN,STAGE]:
            for name,value in EXPECTED.items():
                if sha(root/name)!=value:
                    raise RuntimeError('Package/lock changed before swap')
        if source.stat().st_ino!=protected_inode or (STAGE/'node_modules').resolve()!=source:
            raise RuntimeError('Protected stage dependencies changed')
        if original.is_symlink() or original.stat().st_ino!=original_inode:
            raise RuntimeError('Main dependency preimage changed')
        os.rename(original,backup)
        try:
            os.rename(copied,original)
        except BaseException:
            os.rename(backup,original)
            raise
        receipt['swapped']=True
        if original.is_symlink() or inventory(original)!=baseline:
            raise RuntimeError('Final main dependency map mismatch')
        after_source=module.source_inventory()
        receipt['sourceChanges']=sorted(p for p in set(before_source)|set(after_source)
                                        if before_source.get(p)!=after_source.get(p))
        receipt['protectedDependencyUnchanged']=(source.stat().st_ino==protected_inode and inventory(source)==baseline)
        receipt['mainRealDirectory']=original.is_dir() and not original.is_symlink()
        receipt['packageLockUnchanged']=all(sha(MAIN/name)==value for name,value in EXPECTED.items())
        (out/'copied-dependency-map.json').write_text(json.dumps(baseline,indent=2)+'\n')
        if receipt['sourceChanges'] or not receipt['protectedDependencyUnchanged'] or not receipt['packageLockUnchanged']:
            raise RuntimeError('Final dependency verification failed')
        receipt['status']='RESTORED_VERIFIED_REAL_DIRECTORY'
    except BaseException as exc:
        receipt['status']='FAILED_REQUIRES_REVIEW'
        receipt['error']=str(exc)
        raise
    finally:
        receipt['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
        (out/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print(json.dumps(receipt),flush=True)


if __name__=='__main__':
    run()
