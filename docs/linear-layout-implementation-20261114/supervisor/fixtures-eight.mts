/** Frozen saved inputs; no new recognition or operating Store. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {loadFixtures,repository,sha,jsonSHA,originalPieces,recordProof} from '../../restoration-readability-generalization-20261113/sol2/fixtures.mts';
export {repository,sha,jsonSHA,originalPieces,recordProof};
export async function loadEight(){
 const five=await loadFixtures(),cases:any[]=five.map(f=>({gameId:f.gameId,pack:f.view.pack,session:f.view.session,bytes:f.bytes,photo:f.photo,pins:f.pins,source:f.manifest}));
 for(const gameId of ['sagrada','lost-cities','seven-wonders']){
  const casePath=`docs/pro-review-20261113/data/cases/${gameId}-baseline.json`,packPath=`docs/pro-review-20261113/data/packs/${gameId}.json`,photo=`docs/pro-review-20261113/photos/${gameId}.jpg`;
  const read=async(p:string)=>JSON.parse(await fs.readFile(path.join(repository,p),'utf8'));
  const f=await read(casePath),pack=await read(packPath),bytes=await fs.readFile(path.join(repository,photo));
  const assertions=f.assertions.map((a:any)=>{const {observationReceiptRefs,...rest}=a;return {...rest,observationReceipts:a.observationReceipts??observationReceiptRefs.map((i:number)=>f.receipts[i])};});
  cases.push({gameId,pack,bytes,photo,source:{casePath,packPath,photoSHA:sha(bytes)},pins:await Promise.all([casePath,packPath,photo].map(async(p)=>({path:p,sha256:sha(await fs.readFile(path.join(repository,p)))}))),session:{assertions,evidence:f.photos,turnInstanceId:assertions[0].turnInstanceId,captureEpoch:f.photos[0].captureEpoch}});
 }
 if(cases.reduce((n,f)=>n+originalPieces(f.session).length,0)!==408)throw Error('Frozen eight-input count changed');
 return cases;
}
