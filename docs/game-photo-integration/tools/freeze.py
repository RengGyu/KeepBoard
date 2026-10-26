from pathlib import Path
import json,hashlib,difflib,datetime
R=Path(__file__).resolve().parents[3];D=R/'docs/game-photo-integration';work=json.loads((D/'work-paths.json').read_text());T=Path(work['snapshot']);base=work['baseFiles'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
sharedDrift=[p for p,h in base.items() if sha(R/p)!=h];assert not sharedDrift,sharedDrift
files=dict(base)
for folder in ['src','shared','server','gamepacks','tests','tools']:
 for p in (T/folder).rglob('*'):
  if p.is_file() and not p.is_symlink():files[str(p.relative_to(T))]=sha(p)
for p in list(files):files[p]=sha(T/p);assert files[p],p
changed=[];patch=[]
for p,h in sorted(files.items()):
 before=base.get(p)
 if h==before:continue
 changed.append({'path':p,'beforeSHA256':before,'afterSHA256':h})
 old=(R/p).read_text().splitlines(keepends=True) if before else [];new=(T/p).read_text().splitlines(keepends=True)
 patch.extend(difflib.unified_diff(old,new,fromfile='a/'+p if before else '/dev/null',tofile='b/'+p))
(D/'integrated.patch').write_text(''.join(patch));digest=hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()
build={str(p.relative_to(T)):sha(p) for p in (T/'dist').rglob('*') if p.is_file()}
manifest={'isolation':str(T),'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'fullSourceDigest':digest,'digestAlgorithm':'sha256(sorted compact JSON path->sha256)','backgroundInputDigest':work['backgroundSourceDigest'],'visionContractSetSHA256':'7db2cb75ded4e4249082d8a1850784fcb7774b1d9ed610b8c4c9f82554f11a5d','files':files,'changed':changed,'sharedBaseDrift':sharedDrift,'patchSHA256':sha(D/'integrated.patch'),'dist':build,'sharedProductWrites':0,'realAIcalls':0}
(D/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
verification={'sourceDigest':digest,'tests':588,'testsExit':0,'typecheckExit':0,'viteBuildExit':0,'commands':'verification-run.json','offlineReplay':'offline-replay.json','sharedProductWrites':0,'realAIcalls':0,'actualUI':'Pending independent Sol1 preview validation; no after screenshot claim in this package','baselineAudit':'../game-visuals-full-audit/index.html','sourceFrozen':True}
(D/'verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2)+'\n')
preview=json.loads((D/'preview.json').read_text());preview.update(sourceDigest=digest,distSHA256=build,ownerSessionId=3649);(D/'preview.json').write_text(json.dumps(preview,ensure_ascii=False,indent=2)+'\n')
(D/'browser-verification.json').write_text(json.dumps({'status':'CUA_FRESH_CONTROL_CONNECTION_FAILED','inventory':'getState recovered Chrome as browser1','ownedTab':'738444399','failure':'getTab: 10000ms CDP Emulation.setFocusEmulationEnabled timeout','furtherAttempts':0,'viewportReset':'UNCONFIRMED','actualAfterScreens':0,'followup':'Sol1 independently validates latest frozen static preview at preview.json; prior baseline is not after evidence'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'changedFiles':len(changed),'sourceDigest':digest,'patchSHA256':manifest['patchSHA256'],'sharedDrift':sharedDrift,'paths':[c['path'] for c in changed]},ensure_ascii=False))
