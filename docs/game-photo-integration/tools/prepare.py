from pathlib import Path
import json,hashlib,tempfile,shutil,subprocess
R=Path(__file__).resolve().parents[3]; D=R/'docs/game-photo-integration'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
m=json.loads((R/'docs/background-analysis/source-manifest.json').read_text());f=json.loads((R/'docs/game-visuals-full-audit/fix/manifest.json').read_text())
assert m['fullSourceDigest']=='b19811fa48d6b1bedffb15a6119daba351abb771173af71f23b5012748d571ab'
assert hashlib.sha256(json.dumps(m['files'],sort_keys=True,separators=(',',':')).encode()).hexdigest()==m['fullSourceDigest']
expected=dict(m['files'])
for c in m['changed']:
 if c['beforeSHA256'] is None: expected.pop(c['path'],None)
 else:expected[c['path']]=c['beforeSHA256']
drift=[p for p,h in expected.items() if sha(R/p)!=h]
for c in m['changed']:
 if c['beforeSHA256'] is None and (R/c['path']).exists():drift.append(c['path'])
assert not drift,drift
for c in f['files']:assert sha(R/c['path'])==c['beforeSHA256'],c['path']
T=Path(tempfile.mkdtemp(prefix='keepboard-photo-integration-')).resolve()/'app';T.mkdir()
for name in expected:
 p=Path(name);assert not p.is_absolute() and '..' not in p.parts and not any(x.startswith('.env') or x=='.keepboard' for x in p.parts)
 (T/p).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/p,T/p)
(T/'node_modules').symlink_to(R/'node_modules',target_is_directory=True)
for name in ['background-analysis','game-visuals-full-audit/fix']:
 patch=R/'docs'/name/('integrated.patch' if name=='background-analysis' else 'display-corrections.patch')
 result=subprocess.run(['patch','-p1','--batch','--forward','-i',str(patch)],cwd=T,text=True,capture_output=True)
 (D/('background-patch.log' if name=='background-analysis' else 'display-patch.log')).write_text(result.stdout+result.stderr)
 assert result.returncode==0,result.stdout+result.stderr
for c in m['changed']+f['files']:assert sha(T/c['path'])==c['afterSHA256'],c['path']
(D/'work-paths.json').write_text(json.dumps({'snapshot':str(T),'sharedRoot':str(R),'baselineDrift':drift,'backgroundSourceDigest':m['fullSourceDigest'],'baseFiles':expected,'patchedFiles':m['changed']+f['files'],'AIcalls':0,'envRead':False},indent=2)+'\n')
print(json.dumps({'snapshot':str(T),'baseFiles':len(expected),'baselineDrift':drift,'patchFiles':len(m['changed'])+len(f['files'])}))
