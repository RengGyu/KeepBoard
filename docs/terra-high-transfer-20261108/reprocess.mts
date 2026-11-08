/** Re-run stored 11/7 LB/TQ responses through the CURRENT product code (no provider calls) so all arms share one decoder. */
import fs from 'node:fs/promises';import {processResponse} from '../accuracy-improvement-20261106/implementation/runtime.mts';
const I='/Users/jeonggyuju/Project_folder/KeepBoard/docs/accuracy-improvement-20261106/implementation',W='/private/tmp/kb-terra-high-transfer-20261108';
const pf=JSON.parse(await fs.readFile(I+'/transfer12-preflight.json','utf8'));
for(const j of pf.jobs){const n=JSON.parse(await fs.readFile('/private/tmp/kb-accuracy-improvement-20261106-transfer12/live/'+j.id+'.response.json','utf8'));
 try{const o=processResponse(JSON.parse(await fs.readFile(j.taskPath,'utf8')),n,j.id,j.reader);await fs.writeFile(W+'/'+j.id+'.current.json',JSON.stringify({jobId:j.id,...o}),{mode:0o600});console.log(j.id,'ok');}catch(e){console.log(j.id,'FAIL',(e as Error).message.slice(0,80));}}
