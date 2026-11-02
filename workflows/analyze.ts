import {sleep} from 'workflow';
export async function analyzeWorkflow(id:string){
 'use workflow';
 try{
  const {count,concurrency,hostedScan}=await batchPlan(id);
  if(hostedScan){if(await runScan(id))await commit(id);return;}
  for(let index=0;index<count;index+=concurrency){
   while(!await reserve(id))await sleep('2s');
   // Settle the entire wave before releasing its job lease on failure.
   const wave=await Promise.allSettled(Array.from({length:Math.min(concurrency,count-index)},(_,offset)=>analyzeBatch(id,index+offset)));
   if(wave.some(result=>result.status==='rejected'))throw new Error('Analysis wave interrupted');
  }
  await commit(id);
 }
 catch{await interrupted(id);}
}
async function batchPlan(id:string){'use step';const {cloudRuntime}=await import('../server/cloudRuntime.ts');const {analysisBatches}=await import('../server/analysisTask.ts');const {task} = await cloudRuntime().jobs.load(id);return {count:analysisBatches(task).length,concurrency:task.prepared.scanObservation?2:1,hostedScan:!!task.prepared.scanIntent};}
async function reserve(id:string){'use step';const {cloudRuntime}=await import('../server/cloudRuntime.ts');return cloudRuntime().jobs.slot(id);}
async function analyzeBatch(id:string,index:number){'use step';const {cloudAnalyzeBatch}=await import('../server/cloudRuntime.ts');await cloudAnalyzeBatch(id,index);}
// Upstream may have accepted a request before a connection is lost. Never replay it.
analyzeBatch.maxRetries=0;
async function commit(id:string){'use step';const {finishCloudJob}=await import('../server/cloudRuntime.ts');await finishCloudJob(id);}
async function interrupted(id:string){'use step';const {failCloudJob}=await import('../server/cloudRuntime.ts');await failCloudJob(id);}

async function runScan(id:string){'use step';const {cloudRunHostedScan}=await import('../server/cloudRuntime.ts');return cloudRunHostedScan(id);}
runScan.maxRetries=0;
