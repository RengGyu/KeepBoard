/** Saved results only. Never decode a new response or invent an observation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
export const repository=path.resolve(import.meta.dirname,'../../..');
export const selected=[['final-pool-01','rummikub'],['final-pool-04','hanabi'],['final-pool-05','azul'],['final-pool-06','carcassonne'],['final-pool-07','dominion']] as const;
export const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
export const jsonSHA=(v:unknown)=>sha(JSON.stringify(v));
export function originalPieces(s:any){return s.assertions.filter((a:any)=>a.status==='accepted'&&a.basis!=='rule').flatMap((a:any)=>{
 const v=a.value;const pieces=v?.version==='rummikub-classic-v1'?[...v.groups.flatMap((g:any)=>g.tiles),...v.loose]:v?.pieces??[];
 return pieces.map((p:any)=>({assertionId:a.id,pieceId:p.id,field:a.field,ownerId:a.ownerId??null,value:p}));
});}
export function recordProof(s:any){return s.assertions.filter((a:any)=>a.status==='accepted'&&a.basis!=='rule').map((a:any)=>({id:a.id,field:a.field,ownerId:a.ownerId??null,value:a.value,receipts:a.observationReceipts??[],evidenceIds:a.evidenceIds}));}
export async function loadFixtures(){
 const source='docs/real-photo-review-20261110',review=JSON.parse(await fs.readFile(path.join(repository,source,'review.json'),'utf8'));
 return Promise.all(selected.map(async([id,gameId])=>{
  const row=review.cases.find((c:any)=>c.id===id),dir=path.join(source,'cases',id),read=async(name:string)=>JSON.parse(await fs.readFile(path.join(repository,dir,name),'utf8'));
  if(!row||row.gameId!==gameId)throw Error('Missing original case '+id);
  const view=await read('view.json'),requestDescriptor=await read('request.json'),request=requestDescriptor.request,decoded=await read('decoded.json'),originalSummary=await read('summary.json'),photo=path.join(source,'photos',id+'.jpg'),bytes=await fs.readFile(path.join(repository,photo)),metadata=await sharp(bytes).metadata(),pack=view.pack;
  if(sha(bytes)!==row.sourceSHA||metadata.width!==row.width||metadata.height!==row.height)throw Error('Original photo pin mismatch '+id);
  if(pack.id!==row.packId||pack.version!==row.packVersion||pack.runtime?.source.sha256!==row.sourceDefinitionSHA||request.sourceSHA!==row.sourceDefinitionSHA||request.images[0].sha256!==row.sourceSHA)throw Error('Exact original pack/request mismatch '+id);
  const files=[photo,...['view.json','request.json','decoded.json','native.json','summary.json'].map(n=>path.join(dir,n))];
  const pins=await Promise.all(files.map(async(file)=>({path:file,sha256:sha(await fs.readFile(path.join(repository,file)))})));
  const records=recordProof(view.session),objects=originalPieces(view.session),receipts=records.flatMap((a:any)=>a.receipts);
  if(new Set(objects.map((p:any)=>JSON.stringify([p.assertionId,p.pieceId]))).size!==objects.length)throw Error('Duplicate original live identity '+id);
  return {id,gameId,view,request,decoded,photo,bytes,pins,manifest:{caseId:id,gameId,photo,photoSHA:sha(bytes),width:metadata.width,height:metadata.height,packId:pack.id,packVersion:pack.version,packSourceSHA:pack.runtime.source.sha256,definitionSHA:request.definitionSHA,originalReaderIdentity:requestDescriptor.identity,originalRunDate:originalSummary.startedAt??null,originalJobMs:originalSummary.jobMs??null,originalBodySHA:requestDescriptor.bodySHA,originalWireSHA:requestDescriptor.wireSHA,originalPackSHA:jsonSHA(pack),originalRecordSHA:jsonSHA(records),originalObjectCount:objects.length,originalObservationCount:receipts.reduce((n:number,r:any)=>n+r.result.observations.length,0),unknownPropertyCount:receipts.reduce((n:number,r:any)=>n+r.result.observations.reduce((m:number,o:any)=>m+Object.values(o.properties).filter((p:any)=>p.state==='unknown').length,0),0),recording:pack.runtime.support.recording,fieldKeys:records.map((a:any)=>a.field),sourcePins:pins}};
 }));
}
