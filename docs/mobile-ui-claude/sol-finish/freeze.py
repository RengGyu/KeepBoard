from pathlib import Path
import json,hashlib,difflib,shutil,tempfile,subprocess
repo=Path('/Users/jeonggyuju/Project_folder/KeepBoard')
app=Path('/private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-mobile-ui-claude/app')
out=repo/'docs/mobile-ui-claude/sol-finish'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
digest=lambda m:hashlib.sha256(json.dumps(m,sort_keys=True,separators=(',',':')).encode()).hexdigest()
base=json.loads((repo/'docs/game-state-linking/baseline.json').read_text())
start=json.loads((repo/'docs/mobile-ui-claude/sol-start/manifest.json').read_text())
back=json.loads((repo/'docs/game-state-linking/backend/manifest.json').read_text())
delta=json.loads((repo/'docs/game-state-linking/backend-delta-r1/manifest.json').read_text())
expected=dict(back['files'])
for c in delta['changes']:expected[c['path']]=c['afterSHA256']
backend={p:h for p,h in expected.items() if p.startswith(('server/','shared/','gamepacks/','public/'))}
backend_mismatch=[p for p,h in backend.items() if not (app/p).is_file() or sha(app/p)!=h]
assert not backend_mismatch,backend_mismatch
sources={p.relative_to(app).as_posix():sha(p) for p in sorted((app/'src').rglob('*')) if p.is_file()}
changes=[]; patches=[]; startpatch=[]
for p,h in sources.items():
 before=base['files'].get(p)
 if before==h:continue
 old=None
 if before:
  for candidate in [repo/p,Path(base['snapshot'])/p]:
   if candidate.is_file() and sha(candidate)==before:old=candidate.read_text();break
  assert old is not None,f'baseline unavailable {p}'
 new=(app/p).read_text()
 patches.extend(difflib.unified_diff((old or '').splitlines(keepends=True),new.splitlines(keepends=True),fromfile='a/'+p if before else '/dev/null',tofile='b/'+p))
 cs=start['sourceFiles'].get(p)
 if cs!=h:
  sold=(repo/'docs/mobile-ui-claude/sol-start'/p).read_text() if cs else ''
  startpatch.extend(difflib.unified_diff(sold.splitlines(keepends=True),new.splitlines(keepends=True),fromfile='a/'+p if cs else '/dev/null',tofile='b/'+p))
 target=out/'files'/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(app/p,target)
 changes.append({'path':p,'baselineSHA256':before,'claudeStartSHA256':cs,'afterSHA256':h})
newtest='tests/component-linking-ui.test.ts';t=out/'files'/newtest;t.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(app/newtest,t)
patches.extend(difflib.unified_diff([], (app/newtest).read_text().splitlines(keepends=True),fromfile='/dev/null',tofile='b/'+newtest))
(out/'ui.patch').write_text(''.join(patches));(out/'sol-only.patch').write_text(''.join(startpatch))
final={p:sha(app/p) for p in expected};final[newtest]=sha(app/newtest)
for p,h in sources.items():final[p]=h
unexpected=[p for p in expected if expected[p]!=final[p] and not p.startswith('src/')]
assert not unexpected,unexpected
assets={p.relative_to(app).as_posix():sha(p) for p in [app/'dist/index.html',*sorted((app/'dist/assets').glob('*'))] if p.is_file()}
# Replay the unified patch on verified originals, never in shared product source.
replay=Path(tempfile.mkdtemp(prefix='keepboard-sol-ui-patch-'))
for c in changes:
 p=c['path'];before=c['baselineSHA256']
 if before:
  origin=next(x for x in [repo/p,Path(base['snapshot'])/p] if x.is_file() and sha(x)==before)
  dest=replay/p;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(origin,dest)
result=subprocess.run(['patch','--batch','-p1','-i',str(out/'ui.patch')],cwd=replay,capture_output=True,text=True)
assert result.returncode==0,result.stdout+result.stderr
assert all(sha(replay/c['path'])==c['afterSHA256'] for c in changes)
assert sha(replay/newtest)==sha(app/newtest)
manifest={'app':str(app),'parentDigest':base['parentSourceDigest'],'backendDigest':delta['sourceDigest'],'sourceDigest':digest(final),'sourceFiles':final,'srcDigest':digest(sources),'srcFiles':sources,'changedSrcCount':len(changes),'changes':changes,'tests':{newtest:sha(app/newtest)},'assets':assets,'patchSHA256':sha(out/'ui.patch'),'solOnlyPatchSHA256':sha(out/'sol-only.patch'),'checks':{'backendSharedPacksPublicHashed':len(backend),'backendSharedPacksPublicMismatch':backend_mismatch,'unexpectedNonSrcDrift':unexpected,'patchReplayExit':result.returncode,'patchReplayMatches':len(changes)+1},'validation':{'newSSR':{'pass':3,'fail':0},'focused':{'pass':19,'fail':0,'exit':0},'buildIncludesTSC':{'exit':0,'log':'build-final.log'},'wholeSuite':'Not rerun: next integration owner scope','realAIRequests':0}}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:manifest[k] for k in ['sourceDigest','srcDigest','changedSrcCount','patchSHA256','checks','assets']},ensure_ascii=False,indent=2))
