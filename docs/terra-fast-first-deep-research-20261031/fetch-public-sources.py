"""Public GitHub metadata/source downloads only; never execute downloaded code."""
import datetime
import hashlib
import json
import tempfile
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
REPOS = ['Small-Object-Detection/SAHI', 'PaddlePaddle/PaddleOCR', 'georg-wolflein/chesscog', 'penghao-wu/vstar', 'thunlp/LLaVA-UHD', 'lm-sys/RouteLLM', 'AILab-CVC/YOLO-World']

def get(url):
    # System curl uses its normal certificate verification; no --insecure override.
    data = subprocess.run(['/usr/bin/curl', '--fail', '--location', '--silent', '--show-error', '--max-time', '25', '-A', 'KeepBoard-readonly-research', url], check=True, capture_output=True).stdout
    if len(data) > 6_000_000:
        raise ValueError('Public text response exceeds research limit')
    return data

def metadata():
    previous = OUT / 'source-download-index.json'
    if previous.exists():
        old = json.loads(previous.read_text())
        if all('error' in r for r in old.get('repositories', [])):
            log = OUT / ('fetch-failure-' + str(len(list(OUT.glob('fetch-failure-*')))) + '.json')
            log.write_text(previous.read_text())
        else:
            raise ValueError('Metadata already frozen; do not overwrite')
    base = Path(tempfile.mkdtemp(prefix='keepboard-fast-first-sources-', dir='/private/tmp'))
    rows = []
    for repo in REPOS:
        try:
            meta = json.loads(get('https://api.github.com/repos/' + repo))
            branch = meta['default_branch']
            commit = json.loads(get('https://api.github.com/repos/' + repo + '/commits/' + branch))
            revision = commit['sha']
            tree = json.loads(get('https://api.github.com/repos/' + repo + '/git/trees/' + revision + '?recursive=1'))
            folder = base / repo.replace('/', '__')
            folder.mkdir()
            for name, obj in [('meta.json', meta), ('commit.json', commit), ('tree.json', tree)]:
                (folder / name).write_text(json.dumps(obj))
            row = {'repo': repo, 'branch': branch, 'commit': revision, 'commitDate': commit['commit']['committer']['date'], 'license': meta.get('license'), 'folder': str(folder), 'files': len(tree['tree']), 'truncated': tree.get('truncated', False)}
            rows.append(row)
            print(json.dumps({k: row[k] for k in ['repo', 'commit', 'commitDate', 'files', 'truncated']}), flush=True)
        except Exception as error:
            rows.append({'repo': repo, 'error': str(error)})
            print(repo, type(error).__name__, str(error), flush=True)
            break
    manifest = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'privateDownloadRoot': str(base), 'repositories': rows}
    previous.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    metadata()
