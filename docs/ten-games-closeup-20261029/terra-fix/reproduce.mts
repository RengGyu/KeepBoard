// Offline only: stored Terra responses -> adapter -> unchanged decoder. No network, no key, frozen files read-only.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {decodeGeminiGameObservation} from '../../../server/ai/geminiGameReader.ts';
import {adaptTerraItems,type GeometryPolicy} from './adapter.mts';
const root=path.dirname(new URL(import.meta.url).pathname),old=path.join(root,'../terra-comparison');
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const pre=JSON.parse(await fs.readFile(path.join(old,'preflight.json'),'utf8')),ledger=JSON.parse(await fs.readFile(path.join(old,'ledger.json'),'utf8'));
const decoderSHA=sha(await fs.readFile('server/ai/geminiGameReader.ts'));
const out=process.env.TERRA_FIX_PRIVATE_DIR;assert(out&&out.startsWith('/private/tmp/')&&!out.includes('.keepboard'),'TERRA_FIX_PRIVATE_DIR=/private/tmp/... required');
await fs.mkdir(out,{recursive:true,mode:0o700});await fs.chmod(out,0o700);
const decode=(items:unknown[],t:any)=>decodeGeminiGameObservation({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items})}]}}]},t.request,t.definition);
const rows=[];
for(const t of pre.tasks){
 const row=ledger.find((r:any)=>r.id===t.id),nativeBytes=await fs.readFile(t.prefix+'.native.json');assert.equal(sha(nativeBytes),row.rawSHA);
 const native=JSON.parse(nativeBytes.toString()),text=native.output.filter((x:any)=>x.type==='message').flatMap((m:any)=>m.content).map((p:any)=>p.text).join('');
 const raw=JSON.parse(text);assert.deepEqual(raw,JSON.parse(await fs.readFile(t.prefix+'.parsed.json','utf8')),'parsed file must equal native output_text');
 const task=JSON.parse(await fs.readFile(t.prefix+'.task.json','utf8'));
 const r:any={id:t.id,nativeSHA:row.rawSHA,modelReturned:native.model,status:native.status,rawItems:raw.items.length};
 try{decode(raw.items,task);r.baseline='decoded';}catch{r.baseline='rejected';}
 for(const policy of ['withhold-unless-declared','adopt-consistent-alternate'] as GeometryPolicy[]){
  const a=adaptTerraItems(raw.items,policy);r.boxCheck=a.check;
  try{const d=decode(a.items,task);const f=path.join(out,`${t.id}.${policy}.decoded.json`);await fs.writeFile(f,JSON.stringify(d,null,2)+'\n',{mode:0o600});
   r[policy]={decoded:true,geometry:a.geometry,observations:d.observations.length,withBox:d.observations.filter(o=>o.bbox).length,path:f,sha256:sha(await fs.readFile(f))};
  }catch(e){r[policy]={decoded:false,geometry:a.geometry,error:(e as Error).message.slice(0,120)};}
 }
 rows.push(r);
}
const summary={baselineDecoded:rows.filter(r=>r.baseline==='decoded').length,
 withholdDecoded:rows.filter(r=>r['withhold-unless-declared'].decoded).length,withholdGeometry:rows.filter(r=>r['withhold-unless-declared'].geometry==='contract').length,
 alternateDecoded:rows.filter(r=>r['adopt-consistent-alternate'].decoded).length,alternateGeometry:rows.filter(r=>r['adopt-consistent-alternate'].withBox>0).length};
await fs.writeFile(path.join(root,'reproduction.json'),JSON.stringify({version:'terra-fix-reproduction-v1',decoderSHA,decoderMatchesFrozenPreflight:decoderSHA===pre.decoderSHA,privateDir:out,networkCalls:0,rows,summary},null,2)+'\n');
console.log(JSON.stringify(summary));
