import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonicalJSON} from '../../server/photoDefinitions';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const packs=read('gamepacks/generated/game-essentials.json'),retired=read('gamepacks/generated/retired-packs.json'),photo=read('game-photo-definitions/index.json'),old=read('docs/gamepack-revision-20261026/history/before-runtime-revision/game-photo-definitions/index.json'),spatial=read('game-photo-definitions/spatial/index.json'),reading=read('gamepacks/generated/release-reading.json');
const policies=[...packs,...retired].map(pack=>{
 const d=[...photo.games,...old.games].find(d=>d.packId===pack.id&&d.packVersion===pack.version&&d.sourceSHA===pack.runtime?.source.sha256);if(!d)throw Error('Missing pinned photo definition '+pack.id+' '+pack.version);
 const s=spatial.definitions.find(s=>s.packId===pack.id&&s.packVersion===pack.version&&s.sourceSHA===d.sourceSHA&&s.photoDefinitionSHA===d.definitionSHA&&s.status!=='excluded');
 const selected=reading.games.find(p=>p.packId===pack.id&&p.packVersion===pack.version&&p.sourceSHA===d.sourceSHA&&p.definitionSHA===d.definitionSHA);
 const body={version:'restoration-policy-v1',packId:pack.id,packVersion:pack.version,sourceSHA:d.sourceSHA,definitionSHA:d.definitionSHA,display:d.nativeBridge==='catan'||d.nativeBridge==='rummikub'?'native':s?.structuralNamespaces.length?'map-network':s?.frames.some(f=>f.areas.some(a=>a.addresses.length))?'fixed-slots':'photo-layout',publicAreaIds:d.areas.filter(a=>a.partition!=='owner_private').map(a=>a.id),areas:Object.fromEntries(d.areas.map(a=>[a.id,Object.fromEntries(a.componentIds.map(id=>[id,selected?.areas[a.id]?.[id]??d.components.find(c=>c.id===id).properties.map(f=>f.id)]))])),canonicalSpatial:!!s,limitations:[...(s?['Canonical addresses require a validated visible frame and address; data readiness is not measured accuracy.']:['No compatible canonical frame; source-linked photo layout or unlocated facts only.']),'Hidden faces, ownership and unseen order are not inferred; preserve physical originals.']};
 return {...body,policySHA:createHash('sha256').update(canonicalJSON(body)).digest('hex')};
});
if(new Set(packs.map(p=>p.id)).size!==120)throw Error('Expected current 120 unique packs');
writeFileSync('gamepacks/policies/restoration/index.json',JSON.stringify({version:'restoration-policies-v1',currentCount:packs.length,policies},null,2)+'\n');
console.log(JSON.stringify({current:packs.length,historical:retired.length,policies:policies.length}));
