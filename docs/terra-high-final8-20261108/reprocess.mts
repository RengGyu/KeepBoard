/** Stored FINAL baseline responses (Terra-low, no Q) through CURRENT code; no provider calls. */
import fs from 'node:fs/promises';import {processResponse} from '../accuracy-improvement-20261106/implementation/runtime.mts';
const F='/Users/jeonggyuju/Project_folder/KeepBoard/docs/accuracy-goal-20261106/implementation/final',W='/private/tmp/kb-terra-high-final8-20261108';
for(const f of (await fs.readdir(F+'/requests')).sort()){const m=f.match(/^FINAL-(final-pool-\d+)-baseline-r([12])\.json$/)!;const scene=m[1],id=`${scene}-B-r${m[2]}`,task=JSON.parse(await fs.readFile(F+'/tasks/'+scene+'.json','utf8'));
 try{const n=JSON.parse(await fs.readFile(F+'/live/responses/'+f,'utf8')).response;const o=processResponse(task,n,id,task.reader);await fs.writeFile(W+'/'+id+'.json',JSON.stringify({jobId:id,...o}),{mode:0o600});console.log(id,'ok',o.finalRecords.length);}catch(e){console.log(id,'FAIL',(e as Error).message.slice(0,100));}}
