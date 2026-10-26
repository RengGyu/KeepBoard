from pathlib import Path
import json,hashlib,difflib,datetime
project=Path(__file__).resolve().parents[3];out=project/'docs/game-state-linking/backend';base=json.loads((project/'docs/game-state-linking/baseline.json').read_text());app=Path(base['snapshot']);sha=lambda b:hashlib.sha256(b).hexdigest();files=dict(base['files']);extra=['shared/componentLinking.ts','shared/componentStatePack.ts','server/componentLinking.ts','tests/component-linking.test.ts','tests/component-linking-api.test.ts','tests/component-linking-supply.test.ts','tests/component-linking-catalog.test.ts'];changes=[];patch=[]
for name in sorted(set(files)|set(extra)):
 data=(app/name).read_bytes();after=sha(data);before=files.get(name)
 if after!=before:
  original=(project/name).read_bytes() if before else b''
  if before and sha(original)!=before:raise SystemExit('preimage drift: '+name)
  target=out/'files'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
  patch.extend(difflib.unified_diff(original.decode().splitlines(True),data.decode().splitlines(True),fromfile='a/'+name if before else '/dev/null',tofile='b/'+name))
  changes.append({'path':name,'beforeSHA256':before,'afterSHA256':after,'action':'modify' if before else 'create'})
 files[name]=after
text=''.join(patch);(out/'backend.patch').write_text(text)
digest=sha(json.dumps(files,sort_keys=True,separators=(',',':')).encode());manifest={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'BACKEND_SOURCE_FROZEN_PENDING_UI_INTEGRATION','source':str(app),'parentDigest':base['parentSourceDigest'],'sourceDigest':digest,'digestMethod':'sha256(JSON.stringify sorted path/SHA map compact separators)','files':files,'changes':changes,'changedCount':len(changes),'patchSHA256':sha(text.encode()),'srcChanges':0,'rawSpecArtPackChanges':0,'sharedProductWrites':0,'aiCalls':0};(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({k:manifest[k] for k in ['source','sourceDigest','changedCount','patchSHA256']}));print('\n'.join(c['path'] for c in changes))
