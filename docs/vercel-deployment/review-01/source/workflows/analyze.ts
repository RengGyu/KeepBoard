import {sleep} from 'workflow';
export async function analyzeWorkflow(id:string){
 'use workflow';
 try{const count=await batchCount(id);for(let index=0;index<count;index++){while(!await reserve(id))await sleep('2s');await analyzeBatch(id,index);}await commit(id);}
 catch{await interrupted(id);}
}
async function batchCount(id:string){'use step';const {cloudRuntime}=await import('../server/cloudRuntime.ts');const {analysisBatches}=await import('../server/analysisTask.ts');return analysisBatches((await cloudRuntime().jobs.load(id)).task).length;}
async function reserve(id:string){'use step';const {cloudRuntime}=await import('../server/cloudRuntime.ts');return cloudRuntime().jobs.slot(id);}
async function analyzeBatch(id:string,index:number){'use step';const {cloudAnalyzeBatch}=await import('../server/cloudRuntime.ts');await cloudAnalyzeBatch(id,index);}
// Upstream may have accepted a request before a connection is lost. Never replay it.
analyzeBatch.maxRetries=0;
async function commit(id:string){'use step';const {finishCloudJob}=await import('../server/cloudRuntime.ts');await finishCloudJob(id);}
async function interrupted(id:string){'use step';const {failCloudJob}=await import('../server/cloudRuntime.ts');await failCloudJob(id);}
