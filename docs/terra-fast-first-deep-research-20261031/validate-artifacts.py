"""Validate research artifacts without executing product or downloaded code."""
from pathlib import Path
from urllib.parse import urlparse, unquote
import datetime
import hashlib
import json
import re
import subprocess
import sys

P = Path(__file__).resolve().parent
ROOT = P.parents[1]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text())

errors = []
jsons = []
for p in P.glob('*.json'):
    if p.name == 'validation.json': continue
    try: read(p); jsons.append(p.name)
    except Exception as e: errors.append({'json':p.name,'error':str(e)})

inventory=read(P/'input-inventory.json')
drift=[]
for row in inventory['files']:
    p=ROOT/row['path']
    if not p.exists() or sha(p)!=row['sha256']:
        drift.append({'path':row['path'],'before':row['sha256'],'after':sha(p) if p.exists() else None})

links=0
for p in P.glob('*.md'):
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',p.read_text()):
        if urlparse(target).scheme in {'http','https','mailto'}: continue
        path=unquote(target.split('#')[0])
        if not path: continue
        links+=1
        destination=p.parent/path
        # This validator writes its own report below; it may be absent on first run.
        if destination.resolve()!=(P/'validation.json').resolve() and not destination.exists():
            errors.append({'markdown':p.name,'missingLink':target})

index=read(P/'code-source-index.json')
codeChecked=0
for row in index['files']:
    p=Path(row['localPath'])
    if not p.exists() or sha(p)!=row['sha256']: errors.append({'publicCode':row['path'],'hash':'MISMATCH'})
    else: codeChecked+=1

evidence=read(P/'evidence.json')
for s in evidence['sources']:
    for c in s['code']:
        row=next((r for r in index['files'] if r['url']==c['url']),None)
        if not row or row['sha256']!=c['sha256']: errors.append({'source':s['id'],'codeIndex':'MISMATCH'})

audit=read(P/'offline-audit.json')
before=sha(P/'offline-audit.json')
r=subprocess.run([sys.executable,str(P/'offline-audit.py')],cwd=ROOT,capture_output=True,text=True)
deterministic=r.returncode==0 and before==sha(P/'offline-audit.json')
if not deterministic: errors.append({'auditReproduction':'FAILED','exitCode':r.returncode})

requiredSymbols={
 'server/scanExecution.ts':['runHostedScan','claimBatch','finishBatch','Promise.allSettled'],
 'server/ai/terraGameReader.ts':['buildTerraGameBody','terraResponsePayload','TERRA_IDENTITY'],
 'shared/lightweightRecognition.ts':['compileObservationTask','TerraReaderIdentity'],
 'shared/photoGeometry.ts':['photoFrameTransform','geometryCandidates','mapObservationRegion'],
 'server/observationFusion.ts':['projectGenericFusion','const focused=','focused-provisional'],
 'server/analysisTask.ts':['commitAnalysisTask'],
 'src/ScanObservationResults.tsx':['ScanProgressPreview'],
 'workflows/analyze.ts':['analyzeWorkflow','runScan'],
}
for file,symbols in requiredSymbols.items():
    text=(ROOT/file).read_text()
    for symbol in symbols:
        if symbol not in text:errors.append({'file':file,'symbol':symbol})

additional=['server/hostedObservation.ts','server/localObservation.ts','server/ai/observationAssembly.ts',
 'docs/lightweight-recognition/ocr-diagnostic.json','docs/lightweight-recognition/number-final-handoff.json']
sourceExtras=[{'path':f,'sha256':sha(ROOT/f)} for f in additional]
report={
 'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'researchOnly':True,'newProviderCalls':0,'modelInferenceRuns':0,'modelWeightDownloads':0,
 'productTestsRun':False,'downloadedCodeExecuted':False,
 'jsonParsed':jsons,'relativeMarkdownLinksChecked':links,
 'initialInputFilesHashChecked':len(inventory['files']),'inputDrift':drift,
 'additionalInspectedInputs':sourceExtras,
 'publicCodeFilesHashChecked':codeChecked,'primarySourceFamilies':len(evidence['sources']),
 'codeEvidenceEntries':sum(len(s['code']) for s in evidence['sources']),
 'offlineResponseAudit':{'exitCode':r.returncode,'deterministicBytes':deterministic,'originalResponseHashesChecked':9,'rows':len(audit['rows'])},
 'sourceSymbolCheck':'PASS' if not any('symbol' in e for e in errors) else 'FAIL',
 'externalLinks':'Official paper pages, model cards, API docs and pinned raw source URLs were opened/downloaded during research. Not an automated all-link availability certification; access failures are retained in evidence.json.',
 'performanceStatus':'No new CV/OCR/mobile/vision performance measured. Timing arithmetic is counterfactual, frozen scores remain partial development references.',
 'errors':errors,
 'artifacts':[{'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(P.iterdir()) if p.is_file() and p.name!='validation.json'],
}
(P/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'errors':len(errors),'inputDrift':len(drift),'publicCodeFiles':codeChecked,'localLinks':links,'auditReproduced':deterministic},ensure_ascii=False))
sys.exit(1 if errors else 0)
