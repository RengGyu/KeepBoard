from pathlib import Path
import json,sys,hashlib
R=Path(__file__).resolve().parents[3];D=R/'docs/game-photo-integration';T=Path(json.loads((D/'work-paths.json').read_text())['snapshot']);assert T!=R
packs=json.loads((T/'gamepacks/generated/game-essentials.json').read_text());profiles={};inputs={}
for p in sorted((R/'docs/vision-research-astra/games').glob('*.json')):
 d=json.loads(p.read_text());s=d['pinned_source'];pack=next(x for x in packs if x['id']==s['runtime_pack_id']);source=pack['runtime']['source'];assert source['sha256']==s['sha256'],p.name
 profiles[d['game_id']]={'version':1,'gameId':d['game_id'],'packId':pack['id'],'editionId':source['editionId'],'sourceSHA':s['sha256'],'focus':d['capture_focus'],'areas':[{'id':a['id'],'name':a['name'],'partition':a['partition'],'instruction':a['capture_instruction'],'fields':a['current_ai_destination_fields'],'components':a['allowed_component_ids']} for a in d['areas'] if a['capture_allowed_current'] and a['current_ai_destination_fields']],'visible':{c['component_id']:c['visible_attribute_keys'] for c in d['components']}}
 inputs[str(p.relative_to(R))]=hashlib.sha256(p.read_bytes()).hexdigest()
assert len(profiles)==120
out=T/'shared/capture-profiles.json';out.write_text(json.dumps(profiles,ensure_ascii=False,separators=(',',':'))+'\n');(D/'profile-inputs.json').write_text(json.dumps({'inputs':inputs,'games':120,'bytes':out.stat().st_size,'outputSHA256':hashlib.sha256(out.read_bytes()).hexdigest()},indent=2)+'\n');print('profiles120 bytes',out.stat().st_size)
