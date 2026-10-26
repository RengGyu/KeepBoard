from pathlib import Path
import json,hashlib,shutil
R=Path(__file__).resolve().parents[3];D=R/'docs/game-photo-integration';O=D/'release';m=json.loads((D/'source-manifest.json').read_text());T=Path(m['isolation']);S=O/'staging';A=S/'.vercel/output/static';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
assert m['fullSourceDigest']=='c061328e56121b6b5a2ef5a13185fd722ae33688604181a8de685bb9d472b692'
assert all(sha(T/p)==h for p,h in m['files'].items());assert sha(D/'integrated.patch')==m['patchSHA256']
oldStage=Path(json.loads((R/'docs/game-readouts-117/deploy/stage.json').read_text())['stage']);meta=json.loads((oldStage/'.vercel/project.json').read_text());assert meta['projectId']=='prj_HPh7BKpxtkcFNY6X40w3kbAyPL0V' and meta['orgId']=='team_RgOQUIJZTU9MufwDOGzuJYA6'
oldStatic=json.loads((R/'docs/game-readouts-117/deploy/static-manifest.json').read_text());allow=set(oldStatic);allow={p for p in allow if not p.startswith('assets/') or not p.endswith('.js')};allow|={p.removeprefix('dist/') for p in m['dist'] if p.startswith('dist/assets/') and p.endswith('.js')}
source=Path(m['validatedDistRoot']);actual={str(p.relative_to(source)) for p in source.rglob('*') if p.is_file()};excluded=actual-allow;assert excluded=={'game-art/keepboard-game-art-120.zip'},excluded;assert allow<=actual
manifest={}
for rel in sorted(allow):
 p=Path(rel);assert not p.is_absolute() and '..' not in p.parts and not any(x in ['docs','src','shared','server','tests','.git','.keepboard','uploads','research'] or x.startswith('.env') for x in p.parts)
 src=source/p;assert not src.is_symlink();assert sha(src)==m['dist']['dist/'+rel];dest=A/p;dest.parent.mkdir(parents=True,exist_ok=True)
 if dest.exists():assert sha(dest)==sha(src),'Existing stage differs: '+rel
 else:shutil.copy2(src,dest)
 manifest[rel]={'sha256':sha(dest),'bytes':dest.stat().st_size}
for rel in ['.vercel/project.json','.vercel/output/config.json']:
 dest=S/rel;dest.parent.mkdir(parents=True,exist_ok=True)
 if dest.exists():assert sha(dest)==sha(oldStage/rel)
 else:shutil.copy2(oldStage/rel,dest)
assert len(manifest)==674;assert {str(p.relative_to(A)) for p in A.rglob('*') if p.is_file()}==set(manifest)
allowedStage={'.vercel/project.json','.vercel/output/config.json'}|{'.vercel/output/static/'+p for p in manifest};allStage={str(p.relative_to(S)) for p in S.rglob('*') if p.is_file()};assert allStage==allowedStage
payload=O/'transition/source-after';rollback=O/'transition/source-before';receipt=[]
for c in m['changed']:
 p=Path(c['path']);before=sha(R/p);assert before==c['beforeSHA256'],str(p)
 for base,src,h in [(payload,T/p,c['afterSHA256'])]+([(rollback,R/p,c['beforeSHA256'])] if before else []):
  dest=base/p;dest.parent.mkdir(parents=True,exist_ok=True)
  if dest.exists():assert sha(dest)==h
  else:shutil.copy2(src,dest)
  assert sha(dest)==h
 receipt.append(c)
assert len(receipt)==27
(O/'static-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(O/'transition-manifest.json').write_text(json.dumps({'sourceDigest':m['fullSourceDigest'],'files':receipt,'payload':str(payload),'rollback':str(rollback),'existingRestores':15,'newFileRemovals':12,'StoreRestore':False,'sourceWritesExecuted':False},indent=2)+'\n')
report={'status':'PREPARED_NOT_APPLIED_NOT_DEPLOYED','stage':str(S),'project':meta,'sourceDigest':m['fullSourceDigest'],'patchSHA256':m['patchSHA256'],'staticFiles':len(manifest),'staticBytes':sum(x['bytes'] for x in manifest.values()),'staticManifestSHA256':sha(O/'static-manifest.json'),'routingSHA256':sha(S/'.vercel/output/config.json'),'routingByteIdenticalToPriorStage':True,'excluded':sorted(excluded),'stageExtraFiles':[],'symlinks':[],'sourcePayloadFiles':27,'rollbackExistingFiles':15,'rollbackAbsentFiles':12,'sharedSourceDrift':[],'sharedWrites':0,'processMutations':0,'realAIcalls':0}
(O/'stage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
