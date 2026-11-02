// Offline row validation for diagnostic scoring; never substitutes whole-response decode.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {decodeGeminiGameObservation} from '../../../server/ai/geminiGameReader.ts';
const root=path.dirname(new URL(import.meta.url).pathname),sha=(v:any)=>createHash('sha256').update(v).digest('hex');
const pre=JSON.parse(await fs.readFile(path.join(root,'preflight.json'),'utf8')),ledger=JSON.parse(await fs.readFile(path.join(root,'ledger.json'),'utf8'));
assert.equal(sha(await fs.readFile('server/ai/geminiGameReader.ts')),pre.decoderSHA);
const rows=[];
for(const t of pre.tasks){
 const row=ledger.find((r:any)=>r.id===t.id),parsed=JSON.parse(await fs.readFile(t.prefix+'.parsed.json','utf8'));
 assert.equal(sha(await fs.readFile(t.prefix+'.native.json')),row.rawSHA);
 const {request,definition}=JSON.parse(await fs.readFile(t.prefix+'.task.json','utf8'));
 const observations=[],excluded=[];
 for(const [i,item]of parsed.items.entries()){
  const ref='item-'+(i+1),b=item.box_1000;
  if(b!==null&&(!Array.isArray(b)||b.length!==4||b.some((n:any)=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1000)||b[0]>=b[2]||b[1]>=b[3])){
   excluded.push({ref,reason:'invalid-source-box',reversedAfterThirdFourthSwap:Array.isArray(b)&&b.length===4&&b[0]<b[3]&&b[1]<b[2]});continue;
  }
  try{
   const text=JSON.stringify({items:[item]}),decoded=decodeGeminiGameObservation({candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]},request,definition);
   observations.push({...decoded.observations[0],ref});
  }catch{excluded.push({ref,reason:'other-contract-failure'});}
 }
 const f=t.prefix+'.evaluation-items.json';await fs.writeFile(f,JSON.stringify({observations,excluded,wholeResponseDecoded:row.state==='decoded',
  note:'Evaluation-only independent row validation. Original full-response decoder failure remains; excluded boxes are not reordered/repaired.'},null,2)+'\n',{mode:0o600});
 rows.push({id:t.id,rawItems:parsed.items.length,validEvaluationRows:observations.length,invalidGeometryRows:excluded.filter(x=>x.reason==='invalid-source-box').length,otherInvalidRows:excluded.filter(x=>x.reason!=='invalid-source-box').length,
  wholeResponseDecoded:row.state==='decoded',path:f,sha256:sha(await fs.readFile(f))});
}
await fs.writeFile(path.join(root,'normalization-diagnostic.json'),JSON.stringify({rows,APIcalls:0,boxesRepaired:0,productChanges:0},null,2)+'\n');console.log(JSON.stringify(rows));
