"""Fetch pinned public source text for inspection, never execute or install it."""
import concurrent.futures
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('public_fetch', OUT / 'fetch-public-sources.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
index = json.loads((OUT / 'source-download-index.json').read_text())
base = Path(index['privateDownloadRoot'])

PICKS = {
    'obss/sahi': ['LICENSE', 'sahi/predict.py', 'sahi/slicing.py', 'sahi/postprocess/combine.py', 'pyproject.toml'],
    'PaddlePaddle/PaddleOCR': ['LICENSE', 'paddleocr-js/README.md', 'paddleocr-js/packages/core/README.md', 'paddleocr-js/packages/core/package.json', 'paddleocr-js/packages/core/src/models/det.ts', 'paddleocr-js/packages/core/src/models/rec.ts', 'paddleocr-js/packages/core/src/models/infer.ts', 'paddleocr-js/packages/core/src/pipelines/ocr/core.ts', 'paddleocr-js/packages/core/src/pipelines/ocr/crop.ts', 'paddleocr-js/packages/core/src/pipelines/ocr/default-config.ts', 'paddleocr-js/packages/core/src/pipelines/ocr/worker-backed.ts', 'paddleocr-js/packages/core/src/resources/model-asset.ts', 'paddleocr-js/packages/core/src/runtime/ort.ts', 'docs/version3.x/algorithm/PP-OCRv6/PP-OCRv6.en.md', 'docs/version3.x/algorithm/PP-OCRv5/PP-OCRv5.en.md'],
    'georg-wolflein/chesscog': ['LICENSE', 'README.md', 'pyproject.toml', 'chesscog/corner_detection/detect_corners.py', 'chesscog/recognition/recognition.py', 'chesscog/transfer_learning/recognition.py'],
    'penghao-wu/vstar': ['LICENSE', 'README.md', 'visual_search.py', 'app.py', 'VisualSearch/model/VSM.py'],
    'thunlp/LLaVA-UHD': ['LICENSE', 'README.md', 'llava/slice_process.py', 'llava/model/llava_arch.py', 'llava/model/multimodal_projector/uhd_v1_resampler.py'],
    'lm-sys/RouteLLM': ['LICENSE', 'README.md', 'routellm/controller.py', 'routellm/calibrate_threshold.py', 'routellm/routers/routers.py', 'routellm/routers/matrix_factorization/model.py'],
    'AILab-CVC/YOLO-World': ['LICENSE', 'README.md', 'yolo_world/models/detectors/yolo_world.py', 'yolo_world/models/detectors/yolo_world_image.py', 'deploy/onnx_demo.py', 'demo/image_demo.py'],
}

def canonical_sahi():
    target = OUT / 'canonical-sahi-metadata.json'
    if target.exists():
        return json.loads(target.read_text())
    repo = 'obss/sahi'
    meta = json.loads(helper.get('https://api.github.com/repos/' + repo))
    commit = json.loads(helper.get('https://api.github.com/repos/' + repo + '/commits/' + meta['default_branch']))
    tree = json.loads(helper.get('https://api.github.com/repos/' + repo + '/git/trees/' + commit['sha'] + '?recursive=1'))
    folder = base / 'obss__sahi'
    folder.mkdir(exist_ok=True)
    for name, obj in [('meta.json', meta), ('commit.json', commit), ('tree.json', tree)]:
        (folder / name).write_text(json.dumps(obj))
    row = {'repo': repo, 'branch': meta['default_branch'], 'commit': commit['sha'], 'commitDate': commit['commit']['committer']['date'], 'license': meta.get('license'), 'folder': str(folder), 'truncated': tree.get('truncated', False)}
    target.write_text(json.dumps(row, indent=2) + '\n')
    return row

def fetch_one(item):
    repo, path, info = item
    url = 'https://raw.githubusercontent.com/' + repo + '/' + info['commit'] + '/' + path
    dest = Path(info['folder']) / 'source' / path
    try:
        data = dest.read_bytes() if dest.exists() else helper.get(url)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            dest.write_bytes(data)
        return {'repo': repo, 'commit': info['commit'], 'path': path, 'url': url, 'localPath': str(dest), 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'status': 'downloaded'}
    except Exception as error:
        return {'repo': repo, 'path': path, 'url': url, 'status': 'unavailable', 'error': str(error)}

if __name__ == '__main__':
    infos = {r['repo']: r for r in index['repositories']}
    infos['obss/sahi'] = canonical_sahi()
    tasks = [(repo, path, infos[repo]) for repo, paths in PICKS.items() for path in paths]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(fetch_one, tasks))
    result = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'files': rows, 'downloadedCodeExecuted': False, 'installed': False, 'staleForkExcluded': 'Small-Object-Detection/SAHI'}
    (OUT / 'code-source-index.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'total': len(rows), 'downloaded': sum(r['status'] == 'downloaded' for r in rows), 'failures': [r for r in rows if r['status'] != 'downloaded']}))
