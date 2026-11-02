// Counts output coverage, not visual truth. Independent census is a separate input.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2];if(!dir)throw Error('Private result directory required');
const checklist=JSON.parse(await fs.readFile(new URL('./coverage-checklist.json',import.meta.url),'utf8'));
const ledger=JSON.parse(await fs.readFile(path.join(dir,'ledger.json'),'utf8'));
const models=['gemini-3.8-flash','gemini-4-argon'];
const rows=[];
for(const c of checklist.cases){
 const kinds=c.areas.filter((a:any)=>a.selectedInputArea).flatMap((a:any)=>a.kinds);
 const outputs:any={};
 for(const model of models){
  const call=ledger.find((r:any)=>r.gameId===c.gameId&&r.model===model);let parsed:any=null;
  try{parsed=JSON.parse(await fs.readFile(path.join(dir,c.gameId+'.'+model+'.parsed.json'),'utf8'));}catch{}
  const items=parsed?.items??[];
  outputs[model]={state:call?.state??'not-started',httpStatus:call?.httpStatus??null,ms:call?.ms??null,
   returnedRows:items.length,returnedKinds:call?.counts??{},
   kinds:kinds.map((k:any)=>{const found=items.filter((x:any)=>x.kind===k.componentId);return {componentId:k.componentId,photoStatus:k.photoStatus,returnedRows:found.length,
    assessment:k.photoStatus.startsWith('visible')?(found.length?'kind-returned-object-accuracy-unscored':'visible-kind-has-no-output'):'not-scored-photo-scope-uncertain-or-absent',
    attributes:k.properties.map((p:any)=>{const values=found.flatMap((x:any)=>(x.attributes??[]).filter((a:any)=>a.id===p.id));return {id:p.id,returnedAttributes:values.length,nonNullAttributes:values.filter((a:any)=>a.valueJson!==null&&a.unknownReason===null).length,correctness:'unscored-without-complete-reference'};})};})};
 }
 rows.push({gameId:c.gameId,allGameAccuracy:null,reason:'Other required areas and complete per-object/attribute truth are not established by these photos',outputs});
}
const stats=(xs:number[])=>{if(!xs.length)return null;const sorted=[...xs].sort((a,b)=>a-b),mid=Math.floor(xs.length/2);return {n:xs.length,min:sorted[0],max:sorted.at(-1),mean:xs.reduce((s,n)=>s+n,0)/xs.length,median:xs.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2};};
const report={status:ledger.filter((r:any)=>r.state!=='started').length===60?'calls-finished-visual-adjudication-separate':'in-progress',models,modelOnly:true,retries:0,
 latencyMs:Object.fromEntries(models.map(m=>[m,stats(ledger.filter((r:any)=>r.model===m&&r.state==='received').map((r:any)=>r.ms))])),
 warning:'Output rows/non-null attributes are not correct objects/values. Do not use their ratio as accuracy.',rows};
await fs.writeFile(new URL('./output-coverage.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({finishedCalls:ledger.filter((r:any)=>r.state!=='started').length,status:report.status,latencyMs:report.latencyMs}));
