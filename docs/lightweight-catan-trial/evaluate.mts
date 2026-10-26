// Human correspondences are explicit; the model is not the ground-truth judge.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const read=async(name:string)=>JSON.parse(await readFile(path.join(here,name),'utf8'));
const truthBytes=await readFile(path.join(here,'ground-truth.json'));
assert.equal(createHash('sha256').update(truthBytes).digest('hex'),(await readFile(path.join(here,'ground-truth.sha256'),'utf8')).trim());
const truth=JSON.parse(truthBytes.toString());const raw=await read('lightweight.raw.json');
const components=new Map<string,any>(raw.components.map((c:any)=>[c.id,c]));
const variant=(label:string)=>/구릉|벽돌/.test(label)?'hills':/산맥|광석/.test(label)?'mountains':/숲|나무/.test(label)?'forest':/밭|밀/.test(label)?'fields':/목장|양/.test(label)?'pasture':/사막/.test(label)?'desert':'unclassified';
const color=(label:string)=>/파랑|파란/.test(label)?'blue':/빨강|빨간/.test(label)?'red':/노랑|노란/.test(label)?'yellow':/흰/.test(label)?'white':null;
const contains=(c:any,point:number[])=>c.region&&point[0]>=c.region.x&&point[0]<=c.region.x+c.region.width&&point[1]>=c.region.y&&point[1]<=c.region.y+c.region.height;
const terrain=truth.terrain.map((t:any)=>{
 const [,r,c]=t.id.match(/r(\d)c(\d)/);const observed=components.get(`hex-r${r}-${c}`);assert.ok(observed);
 return {truthId:t.id,outputId:observed.id,kindCorrect:observed.paletteId==='part-1',variantCorrect:variant(observed.label)===t.variant,numberCorrect:observed.number===t.number,sourceCorrect:observed.evidenceId==='research-photo-1',cropContainsHumanAnchor:contains(observed,t.center),quantityCorrect:observed.quantity===1};
});
const buildingIds:any={blue:['blue-city-1','blue-city-2','blue-city-3','blue-city-4','blue-settlement-1'],red:['red-city-1','red-city-2','red-city-3'],yellow:['yellow-city-1','yellow-city-2','yellow-city-3'],white:['white-settlement-2','white-settlement-3']};
const roadIds:any={blue:['blue-road-1','blue-road-3','blue-road-4','blue-road-5','blue-road-6'],red:['red-road-1','red-road-2','red-road-3'],yellow:['yellow-road-1','yellow-road-2','yellow-road-3','yellow-road-4','yellow-road-5','yellow-road-6'],white:['white-road-2',null]};
const pieces=truth.pieces.map((t:any)=>{
 const n=Number(t.id.match(/-(\d+)$/)?.[1]??1)-1;
 const outputId=t.kind==='robber'?'robber-1':(t.kind==='building'?buildingIds:roadIds)[t.color][n];
 const observed=components.get(outputId);
 return {truthId:t.id,outputId:outputId??null,found:Boolean(observed),kindCorrect:observed?(t.kind==='building'?['part-4','part-5'].includes(observed.paletteId):observed.paletteId===(t.kind==='robber'?'part-6':'part-3')):false,colorCorrect:observed&&t.kind!=='robber'?color(observed.color)===t.color:null,ownerCorrect:observed&&t.kind!=='robber'?observed.ownerId===t.color:null,sourceCorrect:observed?.evidenceId==='research-photo-1',cropContainsHumanAnchor:observed?contains(observed,t.center):false,quantityCorrect:observed?.quantity===1};
});
const harborMatches:any={'harbor-lower-left':'harbor-9','harbor-bottom':'harbor-7','harbor-lower-right':'harbor-5','harbor-bottom-right':'harbor-6'};
const harborResource=(s:string)=>/나무/.test(s)?'lumber':/벽돌/.test(s)?'brick':/양/.test(s)?'wool':/밀/.test(s)?'grain':/광석/.test(s)?'ore':null;
const harbors=truth.harbors.map((t:any)=>{const c=components.get(harborMatches[t.id]);return {truthId:t.id,outputId:c.id,expectedResource:t.resource,observedResource:harborResource(c.label),resourceCorrect:harborResource(c.label)===t.resource,ratioCorrect:c.label.includes(`${t.ratio}:1`),cropContainsHumanAnchor:contains(c,t.center)};});
const findings={
 baseline:{quality:'not-evaluable',reason:'HTTP 200 but application requestJSON failed before returning raw parsed JSON; no baseline output retained; no retry.'},
 lightweight:{returnedComponents:raw.components.length,terrainCorrect:terrain.filter((t:any)=>t.kindCorrect&&t.variantCorrect).length,terrainTotal:19,readableNumbersCorrect:terrain.filter((t:any)=>truth.terrain.find((x:any)=>x.id===t.truthId).number!==null&&t.numberCorrect).length,readableNumbersTotal:18,terrainAnchorInsideCrop:terrain.filter((t:any)=>t.cropContainsHumanAnchor).length,certainPieceMatches:pieces.filter((t:any)=>t.found&&t.kindCorrect).length,frozenPieceDenominator:30,matchedPieceAnchorInsideCrop:pieces.filter((t:any)=>t.found&&t.cropContainsHumanAnchor).length,matchedPlayerColorCorrect:pieces.filter((t:any)=>t.colorCorrect===true).length,matchedPlayerColorEvaluated:pieces.filter((t:any)=>t.found&&t.colorCorrect!==null).length,harborFrozenLabelsMatching:harbors.filter((h:any)=>h.resourceCorrect&&h.ratioCorrect).length,harborFrozenLabelsCompared:4,harborRatioCorrect:harbors.filter((h:any)=>h.ratioCorrect).length,allReturnedCropsReferToProvidedPhoto:raw.components.every((c:any)=>c.evidenceId==='research-photo-1'),confirmedCorrectionCount:null,additionalReviewCandidates:2},
 reviewCandidates:[
  {outputId:'blue-road-2',type:'possible physical duplicate',observed:'separate road above blue-city-2',human:'appears to be tall part of blue building; independent road vs molded building cannot be established confidently from this single image',action:'inspect before accepting/counting',basis:'supplementary post-output human zoom of original; no change to frozen truth'},
 {outputId:'white-road-3',type:'ambiguous white object',observed:'white road along forest8/pasture10',human:'enlargement may show a raised white road; border vs piece unresolved, not a proven false addition',action:'inspect or leave candidate uncertain',basis:'supplementary post-output original inspection'},
 ],
 groundTruthCaveat:{harborBottom:'Frozen wool label is questionable: post-output zoom looks like a yellow tied grain sheaf. Do not call this proven model error or 3/4 harbor accuracy; retain raw frozen comparison and exclude this label from reliable scoring.',id:'white-road-2',frozen:'road around (532,365)',review:'Post-output zoom shows tile border/part of adjacent white building, not a separately certain road. Original frozen list is retained unchanged. Thus 29/30 is not one proven model omission. Treat valid certain subset as 29; do not claim exhaustive recall.',reviewedSubsetMatches:'29/29, exploratory post-review subset; not primary preregistered metric'},
 outsideCommonBoardScope:raw.components.filter((c:any)=>c.paletteId==='part-8').map((c:any)=>c.id),
 unscored:['confirmed correction count / exhaustive false positives','bottom harbor resource after human-baseline concern','settlement vs city','other five harbor labels/contacts','canonical slots','unmatched small white components','private states/turn','complete piece precision and recall','UI corrections/time'],
 terrain,pieces,harbors,
};
assert.equal(findings.lightweight.terrainCorrect,19);assert.equal(findings.lightweight.readableNumbersCorrect,18);assert.equal(findings.lightweight.certainPieceMatches,29);assert.equal(findings.lightweight.harborFrozenLabelsMatching,3);
assert.equal(pieces.filter((p:any)=>p.ownerCorrect===true).length,28);
await writeFile(path.join(here,'evaluation.json'),JSON.stringify(findings,null,2)+'\n');
console.log(JSON.stringify({status:'EVALUATION PASS (lightweight only; paired accuracy unavailable)',metrics:findings.lightweight}));
