// Offline only: freeze prompt/GT/image references; never sends a request.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
const sha=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex');
const here=path.dirname(new URL(import.meta.url).pathname);
const old=JSON.parse(await fs.readFile(path.join(here,'../game-state-linking/recognition-check/preflight.json'),'utf8'));
const evaluated=JSON.parse(await fs.readFile(path.join(here,'../recognition-check-4games/manifest.json'),'utf8'));
const cardPath=path.join(here,'../recognition-research-astra/experiment-card.json');
const cardBytes=await fs.readFile(cardPath),card=JSON.parse(cardBytes.toString());
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'keepboard-observation-ab-'));await fs.chmod(dir,0o700);
const inputs=[];
for(const gameId of ['catan','splendor','sagrada']){
 const i=old.inputs.find((x:any)=>x.gameId===gameId),f=JSON.parse(await fs.readFile(i.privateInputFile,'utf8'));
 const e=evaluated.newFourCallEvaluation.cases.find((x:any)=>x.gameId===gameId);
 if(sha(f.prompt)!==i.promptSHA||sha(await fs.readFile(f.image))!==i.imageSHA||sha(await fs.readFile(e.evaluationOnlyGTPath))!==e.GT_SHA256)throw Error('Frozen input drift');
 const c=card.cases.find((x:any)=>x.game_id===gameId),b=c.diagnostic_prompt;
 if(c.image_sha256!==i.imageSHA||c.baseline_prompt_sha256!==i.promptSHA||sha(b)!==c.diagnostic_prompt_sha256)throw Error('Astra card mismatch');
 const prompts={A:f.prompt,B:b};const paths:Record<string,string>={};
 for(const arm of ['A','B'] as const){paths[arm]=path.join(dir,gameId+'-'+arm+'.prompt.txt');await fs.writeFile(paths[arm],prompts[arm],{mode:0o600});}
 inputs.push({gameId,imagePath:f.image,imageSHA:i.imageSHA,imageBytes:i.imageBytes,mimeType:'image/jpeg',originalFixturePath:i.privateInputFile,GTPath:e.evaluationOnlyGTPath,GTSHA:e.GT_SHA256,prompts:Object.fromEntries(['A','B'].map(arm=>[arm,{path:paths[arm],sha256:sha(prompts[arm as 'A'|'B']),bytes:Buffer.byteLength(prompts[arm as 'A'|'B']),inputTokenConservativeBound:Buffer.byteLength(prompts[arm as 'A'|'B'])+10240}]))});
}
const preflight={schema:'photo-observation-ab-v1',status:'AWAITING_EXACT_SCRIPT_REVIEW_AND_PERMISSION',realCalls:0,privateDirectory:dir,astraCardPath:cardPath,astraCardSHA:sha(cardBytes),baselinePreflightSHA:sha(await fs.readFile(path.join(here,'../game-state-linking/recognition-check/preflight.json'))),sourceManifestPath:path.join(here,'../game-state-linking/integration/source-manifest.json'),sourceDigest:old.sourceDigest,model:'deepseek-flash',effort:'high',detail:'high',maxAttemptsIncludingFailures:6,automaticRetries:0,maxInputTokens:32768,maxOutputTokensIncludingReasoning:32768,peakUSDPerMillion:{input:.3,output:1.2},reservedPerAttemptUSD:.049152,maximumCostUSD:.294912,hardCapUSD:.30,inputBoundMethod:'UTF8 prompt bytes + 10240 reserved for the same <=1024px image and framing; conservative estimate, not provider tokenization proof. Reviewer approval required before send.',inputs,order:card.sequence.map((s:string,index:number)=>{const [gameId,arm]=s.split(':');return {sequence:index+1,gameId,arm};}),evaluation:{sameGT:true,rawOnly:true,scoring:card.scoring}};
if(inputs.some(i=>Object.values(i.prompts).some((p:any)=>p.inputTokenConservativeBound>32768)))throw Error('Input reservation bound');
await fs.writeFile(path.join(here,'preflight.json'),JSON.stringify(preflight,null,2)+'\n');
console.log(JSON.stringify({prepared:true,realCalls:0,privateDirectory:dir,promptHashes:inputs.map(i=>({gameId:i.gameId,prompts:i.prompts})),maximumCostUSD:preflight.maximumCostUSD}));
