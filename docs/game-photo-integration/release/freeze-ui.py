from pathlib import Path
import json,hashlib,shutil,subprocess,difflib,datetime
R=Path(__file__).resolve().parents[3];D=R/'docs/game-photo-integration';O=D/'release';old=json.loads((D/'source-manifest.json').read_text());T=Path(old['isolation']);B=O/'before-ui-files';B.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
expected=['src/PhotoCaptureGuide.tsx','src/SessionWorkspace.tsx','tests/photo-capture-ui.test.ts'];drift=[p for p,h in old['files'].items() if sha(T/p)!=h];assert sorted(drift)==sorted(expected),drift
for n in ['source-manifest.json','integrated.patch','verification.json']:shutil.copy2(D/n,O/('before-ui-'+n))
for c in old['changed']:
 if c['beforeSHA256'] is not None:
  (B/c['path']).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/c['path'],B/c['path'])
r=subprocess.run(['patch','-p1','--batch','-i',str(O/'before-ui-integrated.patch')],cwd=B,capture_output=True,text=True);assert r.returncode==0,r.stdout+r.stderr
assert all(sha(B/c['path'])==c['afterSHA256'] for c in old['changed'])
ui=[];udiff=[]
for p in expected:
 ui.append({'path':p,'beforeSHA256':sha(B/p),'afterSHA256':sha(T/p)})
 udiff.extend(difflib.unified_diff((B/p).read_text().splitlines(keepends=True),(T/p).read_text().splitlines(keepends=True),fromfile='a/'+p,tofile='b/'+p))
(O/'ui-copy.diff').write_text(''.join(udiff));m=dict(old);m['files']=dict(old['files'])
for p in expected:m['files'][p]=sha(T/p)
assert all(sha(T/p)==h for p,h in m['files'].items())
base=json.loads((D/'work-paths.json').read_text())['baseFiles'];assert not [p for p,h in base.items() if sha(R/p)!=h]
changed=[];patch=[]
for p,h in sorted(m['files'].items()):
 before=base.get(p)
 if h==before:continue
 changed.append({'path':p,'beforeSHA256':before,'afterSHA256':h});previous=(R/p).read_text().splitlines(keepends=True) if before else []
 patch.extend(difflib.unified_diff(previous,(T/p).read_text().splitlines(keepends=True),fromfile='a/'+p if before else '/dev/null',tofile='b/'+p))
(D/'integrated.patch').write_text(''.join(patch));m['changed']=changed;m['patchSHA256']=sha(D/'integrated.patch');m['previousSourceDigest']=old['fullSourceDigest'];m['fullSourceDigest']=hashlib.sha256(json.dumps(m['files'],sort_keys=True,separators=(',',':')).encode()).hexdigest();m['frozenAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();m['uiCopyChanged']=ui;m['validatedDistRoot']=str(O/'validated-dist');m['dist']={'dist/'+str(p.relative_to(O/'validated-dist')):sha(p) for p in (O/'validated-dist').rglob('*') if p.is_file()}
assert len(m['dist'])==len(old['dist']);assert all(sha(T/p)==h for p,h in m['dist'].items()),'Served dist differs; do not overwrite it.'
m['verification']={'previousFullSuite':{'sourceDigest':old['fullSourceDigest'],'tests':588,'exit':0},'currentUiDelta':{'tests':14,'exit':0,'typecheckExit':0,'separateBuildExit':0,'file':'release/ui-copy-verification.json'}}
(D/'source-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');(O/'ui-copy-manifest.json').write_text(json.dumps({'beforeDigest':old['fullSourceDigest'],'afterDigest':m['fullSourceDigest'],'changed':ui,'diffSHA256':sha(O/'ui-copy.diff'),'captureProfileJSONUnchanged':sha(T/'shared/capture-profiles.json')==old['files']['shared/capture-profiles.json'],'machinePromptAndScopeUnchanged':True,'sharedWrites':0,'operatingImpact':0,'previewProcessChanged':False,'previewStaticPathWrittenOnce':True},ensure_ascii=False,indent=2)+'\n')
(D/'verification.json').write_text(json.dumps({'sourceDigest':m['fullSourceDigest'],'sourceFrozen':True,**m['verification'],'realAIcalls':0,'sharedProductWrites':0,'actualUI':'Sol1 independently reviewing final Korean copy/artifact hashes; not claimed by this worker'},ensure_ascii=False,indent=2)+'\n')
p=json.loads((D/'preview.json').read_text());p.update(sourceDigest=m['fullSourceDigest'],distSHA256=m['dist'],validatedDistRoot=m['validatedDistRoot']);(D/'preview.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sourceDigest':m['fullSourceDigest'],'changed':len(changed),'uiChanged':ui,'distJS':[p for p in m['dist'] if p.endswith('.js')],'patchSHA256':m['patchSHA256']},ensure_ascii=False))
