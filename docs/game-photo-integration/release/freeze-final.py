from pathlib import Path
import json,hashlib,difflib,shutil,datetime
R=Path(__file__).resolve().parents[3];D=R/'docs/game-photo-integration';O=D/'release';old=json.loads((D/'source-manifest.json').read_text());T=Path(old['isolation']);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
changes=[p for p,h in old['files'].items() if sha(T/p)!=h];assert sorted(changes)==['server/ai/generic.ts','tests/photo-capture-api.test.ts'],changes
for n in ['source-manifest.json','integrated.patch','verification.json']:shutil.copy2(D/n,O/('before-accept-'+n))
base=json.loads((D/'work-paths.json').read_text())['baseFiles'];assert not [p for p,h in base.items() if sha(R/p)!=h]
m=dict(old);m['files']={p:sha(T/p) for p in old['files']};m['fullSourceDigest']=hashlib.sha256(json.dumps(m['files'],sort_keys=True,separators=(',',':')).encode()).hexdigest();m['previousSourceDigest']=old['fullSourceDigest'];m['frozenAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();m['validatedDistRoot']=str(O/'final-dist');m['dist']={'dist/'+str(p.relative_to(O/'final-dist')):sha(p) for p in (O/'final-dist').rglob('*') if p.is_file()};assert len(m['dist'])==675
patch=[];changed=[]
for p,h in sorted(m['files'].items()):
 before=base.get(p)
 if h==before:continue
 changed.append({'path':p,'beforeSHA256':before,'afterSHA256':h});beforeLines=(R/p).read_text().splitlines(keepends=True) if before else []
 patch.extend(difflib.unified_diff(beforeLines,(T/p).read_text().splitlines(keepends=True),fromfile='a/'+p if before else '/dev/null',tofile='b/'+p))
(D/'integrated.patch').write_text(''.join(patch));m['changed']=changed;m['patchSHA256']=sha(D/'integrated.patch');m['verification']={'sourceDigest':m['fullSourceDigest'],'fullSuite':{'tests':591,'exit':0},'typecheckExit':0,'separateBuildExit':0,'logs':'release/verification-run.json'};m['acceptFixChanged']=[{'path':p,'beforeSHA256':old['files'][p],'afterSHA256':m['files'][p]} for p in changes]
(D/'source-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');(D/'verification.json').write_text(json.dumps({'sourceFrozen':True,**m['verification'],'realAIcalls':0,'sharedProductWrites':0,'actualUI':'Sol1 checked UI independently;64188 serves prior backend module, unchanged final frontend bundle; accept fix API has synthetic direct+independent RED/GREEN proof.'},ensure_ascii=False,indent=2)+'\n')
# Do not change the running preview/static files. Record its mixed generation honestly.
p=json.loads((D/'preview.json').read_text());p['staticSourceDigest']=old['fullSourceDigest'];p['backendSourceDigest']='ecb937282bf255371b499cddc752fe997da5f6d5bbc0f09094e89d44b4021a70';p['releaseSourceDigest']=m['fullSourceDigest'];p['releaseDistSHA256']=m['dist'];p['acceptApiFixLoaded']=False;(D/'preview.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
# The final backend-only fix produces exactly the already-served Korean-copy client bundle.
assert all(sha(T/p)==h for p,h in m['dist'].items()),'do not rewrite preview; report any difference'
(O/'accept-fix-manifest.json').write_text(json.dumps({'sourceDigest':m['fullSourceDigest'],'changed':m['acceptFixChanged'],'redLog':'accept-red.log','greenLog':'accept-green.log','freshResponseAndCommitGuardPreserved':True,'sharedWrites':0,'operatingImpact':0,'previewSourceOrProcessChanged':False},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sourceDigest':m['fullSourceDigest'],'patchSHA256':m['patchSHA256'],'changed':len(changed),'newFiles':sum(c['beforeSHA256'] is None for c in changed),'distRoot':m['validatedDistRoot'],'JS':{p:h for p,h in m['dist'].items() if p.endswith('.js')}},ensure_ascii=False))
