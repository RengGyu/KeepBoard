from pathlib import Path
import hashlib,json,os,datetime
root=Path(__file__).resolve().parents[3];folder=root/'docs/game-state-linking/integration';m=json.loads((folder/'source-manifest.json').read_text());app=Path(m['source']);sha=lambda b:hashlib.sha256(b).hexdigest();payload=[]
for c in m['changes']:
 f=root/c['path'];before=c['beforeSHA256'];assert (f.is_file() and sha(f.read_bytes())==before) if before else not f.exists(),'Shared preimage drift: '+c['path'];b=(app/c['path']).read_bytes();assert sha(b)==c['afterSHA256'];payload.append((c,b))
# Check every known unowned baseline file first; never overwrite an unrelated difference.
baseline=json.loads((root/'docs/game-state-linking/baseline.json').read_text())['files'];owned={c['path'] for c in m['changes']};unownedDrift=[n for n,h in baseline.items() if n not in owned and sha((root/n).read_bytes())!=h]
if unownedDrift:raise SystemExit('Unowned baseline drift: '+str(unownedDrift))
for c,b in payload:
 target=root/c['path'];backup=folder/'shared-before'/c['path']
 if target.exists():backup.parent.mkdir(parents=True,exist_ok=True);backup.write_bytes(target.read_bytes())
 target.parent.mkdir(parents=True,exist_ok=True);tmp=target.with_name('.'+target.name+'.linking-integration-tmp');tmp.write_bytes(b);os.replace(tmp,target)
assert all(sha((root/n).read_bytes())==h for n,h in m['files'].items());receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'EXACT_SHARED_UNION_APPLIED','method':'exact file copy once, no patch reapplication','sourceDigest':m['sourceDigest'],'filesApplied':len(payload),'preimageDrift':0,'unownedRegisteredDrift':unownedDrift,'knownFilesMatch':len(m['files']),'newUserDataOrConfigWrites':0,'deployment':False,'changes':m['changes']};(folder/'shared-apply.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:receipt[k] for k in ['status','filesApplied','preimageDrift','unownedRegisteredDrift','knownFilesMatch']}))
