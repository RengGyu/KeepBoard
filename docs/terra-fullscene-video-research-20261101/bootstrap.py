"""Freeze scoped read-only evidence. Does not inspect credentials or sessions."""
from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
FILES = [
    'src/scanQuality.ts', 'src/Capture.tsx', 'src/scanBatch.ts', 'src/api.ts',
    'src/ScanObservationResults.tsx', 'server/ai/geminiGameReader.ts',
    'server/ai/terraGameReader.ts', 'server/ai/catanSceneReading.ts',
    'server/observationFusion.ts', 'server/scanExecution.ts',
    'server/scanObservation.ts', 'shared/scanObservation.ts',
    'shared/lightweightRecognition.ts', 'shared/photoGeometry.ts',
    'server/hostedObservation.ts', 'server/analysisTask.ts', 'workflows/analyze.ts',
    'docs/static-video-multiview-20261101/README.md',
    'docs/public-scan-test-20261028/README.md',
    'docs/public-scan-test-20261028/result.json',
    'docs/terra-quality-iteration-20261030/preflight-high.json',
    'docs/terra-quality-iteration-20261030/evaluation-high.json',
    'docs/terra-quality-iteration-20261030/crop-high/evaluation.json',
    'docs/terra-quality-iteration-20261030/independent-high-review.md',
    'docs/terra-quality-iteration-20261030/independent-crop-high-review.md',
    'docs/terra-ten-game-evaluation-20261030/README.md',
    'docs/terra-ten-game-evaluation-20261030/summary.json',
    'docs/terra-fast-first-deep-research-20261031/offline-audit.json',
    'docs/terra-fast-first-deep-research-20261031/evidence.json',
]
destination = OUT/'input-inventory.json'
if destination.exists():
    raise SystemExit('Initial inventory already exists; do not overwrite it.')
rows=[]
for name in FILES:
    p=ROOT/name
    rows.append({'path':name,'exists':p.exists(),**({'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} if p.exists() else {})})
destination.write_text(json.dumps({'captured_on':'2026-11-01','scope':'current shared source, not a deployed-version assertion','files':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(rows),'missing':[r['path'] for r in rows if not r['exists']]}))
