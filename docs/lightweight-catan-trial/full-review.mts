// Post-output HUMAN review of original, complete 12-zone grid and all 67 target crops.
// Not a new preregistered benchmark: frozen ground-truth files remain unchanged.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const raw=JSON.parse(await readFile(path.join(here,'lightweight.raw.json'),'utf8'));
const output=raw.components;
const uncertainRoads=['blue-road-2','white-road-3'];
const roadNeighbors:Record<string,string[]>={
 'blue-road-1':['r1c1','sea'],'blue-road-2':['r1c1','r1c2'],'blue-road-3':['r1c3','r2c4'],'blue-road-4':['r2c3','r2c4'],'blue-road-5':['r2c4','r3c4'],'blue-road-6':['r2c4','r3c5'],
 'white-road-1':['r1c1','r2c1'],'white-road-2':['r2c1','r2c2'],'white-road-3':['r2c2','r3c2'],
 'yellow-road-1':['r1c2','r2c3'],'yellow-road-2':['r2c2','r2c3'],'yellow-road-3':['r3c3','r3c4'],'yellow-road-4':['r3c3','r4c3'],'yellow-road-5':['r4c2','r4c3'],'yellow-road-6':['r4c2','r5c2'],
 'red-road-1':['r3c4','r4c4'],'red-road-2':['r3c5','r4c4'],'red-road-3':['r3c5','sea'],
};
const buildingNeighbors:Record<string,string[]>={
 'blue-city-1':['r1c1','sea'],'blue-city-2':['r1c1','r1c2','r2c2'],'blue-city-3':['r1c3','r2c4','sea'],'blue-city-4':['r2c3','r2c4','r3c4'],'blue-settlement-1':['r2c4','r3c5','sea'],
 'white-settlement-1':['r1c1','r2c1','sea'],'white-settlement-2':['r2c1','r2c2','r3c2'],'white-settlement-3':['r4c3','r5c2','r5c3'],
 'yellow-city-1':['r1c2','r1c3','r2c3'],'yellow-city-2':['r2c2','r2c3','r3c3'],'yellow-city-3':['r4c2','r5c1','r5c2'],
 'red-city-1':['r3c1','r3c2','r4c1'],'red-city-2':['r3c4','r4c3','r4c4'],'red-city-3':['r3c5','sea'],
};
const harbors:Record<string,any>={
 'harbor-1':{region:'upper-left',humanType:'generic',typeVerdict:'match',humanPrintedRatio:3,ratioVerdict:'match'},
 'harbor-2':{region:'top',humanType:'wool',typeVerdict:'match',humanPrintedRatio:2,ratioVerdict:'match'},
 'harbor-3':{region:'upper-right',humanType:'ore',typeVerdict:'wrong',humanPrintedRatio:null,ratioVerdict:'unresolved',note:'Visible gray ore icon contradicts generic label. Tiny printed ratio not scored; do not replace photo reading with standard-rule inference.'},
 'harbor-4':{region:'right',humanType:'generic',typeVerdict:'match',humanPrintedRatio:3,ratioVerdict:'match',contactEvidence:'one dock endpoint partly covered by red building'},
 'harbor-5':{region:'lower-right',humanType:'brick',typeVerdict:'match',humanPrintedRatio:2,ratioVerdict:'match'},
 'harbor-6':{region:'bottom-right',humanType:'generic',typeVerdict:'match',humanPrintedRatio:3,ratioVerdict:'match'},
 'harbor-7':{region:'bottom',humanType:'grain',typeVerdict:'match',humanPrintedRatio:2,ratioVerdict:'match',note:'Yellow tied sheaf. Frozen wool baseline is erroneous/questionable; this is transparent post-review human correction, not AI-derived truth.'},
 'harbor-8':{region:'bottom-left',humanType:'generic',typeVerdict:'wrong',humanPrintedRatio:3,ratioVerdict:'wrong',note:'Two docks and printed generic 3:1; no ore icon. Claimed 2:1 ore is unsupported.'},
 'harbor-9':{region:'lower-left',humanType:'lumber',typeVerdict:'match',humanPrintedRatio:2,ratioVerdict:'match'},
};
const photo='research-photo-1';
const review=output.map((c:any)=>{
 const r:any={id:c.id,modelLabel:c.label,paletteId:c.paletteId,sourcePhotoCorrect:c.evidenceId===photo,region:c.region,quantity:c.quantity,
   cropTargetPresent:'yes',otherPhysicalTargetInBox:'not-observed-in-manual-review; not segmentation guarantee',canonicalSlotSupplied:false,formalFaceSupplied:c.face!=null,formalAttachmentSupplied:c.attachedToId!=null};
 if(c.paletteId==='part-1') return {...r,category:'terrain',kindVerdict:'match',numberVerdict:c.number===null?'desert-no-number-match':'match',otherPhysicalTargetInBox:'yes, separate pieces or fragments at tile margins; token on tile also visible',relationVerdict:'image-row location matches; no canonical slot'};
 if(c.paletteId==='part-3') return {...r,category:'road',humanObservedColor:c.id.split('-')[0],colorAndOwnerVerdict:'match',independentRoadVerdict:uncertainRoads.includes(c.id)?'unresolved':'match',cropTargetPresent:uncertainRoads.includes(c.id)?'blue/white target material present; independent road unresolved':'yes',humanImageNeighbors:roadNeighbors[c.id],relationVerdict:uncertainRoads.includes(c.id)?'relative edge plausible; independent piece unresolved':'matches photo-relative boundary',note:c.id==='blue-road-2'?'Separate road vs tall molded part of adjacent blue building unresolved.':c.id==='white-road-3'?'Raised white road vs bright border unresolved at source resolution.':undefined};
 if(['part-4','part-5'].includes(c.paletteId)) return {...r,category:'building',buildingPresent:'yes',humanObservedColor:c.id.split('-')[0],colorAndOwnerVerdict:'match',modelSubtype:c.paletteId==='part-4'?'settlement':'city',subtypeVerdict:'unresolved',humanImageNeighbors:buildingNeighbors[c.id],relationVerdict:'matches photo-relative junction',note:'Sculpted pieces visible, but no reliable settlement/city reference for this set and several silhouettes/white details blurred. Do not score subtype or points as confirmed.'};
 if(c.paletteId==='part-6') return {...r,category:'robber',kindVerdict:'match',humanImageNeighbors:['r1c1'],relationVerdict:'on upper-left hills 6',colorVerdict:'black/dark gray material, not an ownership error'};
 if(c.paletteId==='part-7') return {...r,category:'harbor',exists:'yes',...harbors[c.id],contactEvidence:harbors[c.id].contactEvidence??'two printed docks visible in surrounding original',exactCanonicalEndpointPair:null,outputEndpointPair:null,endpointVerdict:'not supplied / not supported in A',otherPhysicalTargetInBox:c.id==='harbor-4'?'yes, red building fragment at lower crop edge':r.otherPhysicalTargetInBox};
 return {...r,category:'card',cardPresent:'yes',frontOrBackHuman:'front visible',identityVerdict:['card-special-top-right','card-open-top-right-1'].includes(c.id)?'specific title/identity unresolved':'visible knight or cost/reference-card category matches',partialAtPhotoEdge:['card-knight-left','card-cost-right','card-special-top-right','card-open-top-right-1'].includes(c.id),otherPhysicalTargetInBox:c.id==='card-cost-bottom-left'?'yes, another card fragment at upper-left of rectangular box':r.otherPhysicalTargetInBox,note:'Not a hidden hand inference. All outside-board cards are outside core board geometry comparison. No formal face/owner/history inferred.'};
});
assert.equal(review.length,67);assert.equal(new Set(review.map((r:any)=>r.id)).size,67);
for(const c of output) assert.ok(review.find((r:any)=>r.id===c.id));
const byColor=(p:string)=>Object.fromEntries(['blue','red','yellow','white'].map(color=>[color,output.filter((c:any)=>p==='building'?['part-4','part-5'].includes(c.paletteId)&&c.ownerId===color:c.paletteId===p&&c.ownerId===color).length]));
const result={
 methodology:'Post-output human review of original, entire 12-zone coverage grid, 67 target crops and wider harbor context. Original frozen baseline untouched; this is not a new independent preregistered benchmark. Image-space neighbors are not canonical slots.',
 reviewedOutputCount:67,independentWholePhotoZonesReviewed:12,
 summary:{terrain:{output:19,matching:19},numbers:{outputInline:18,matching:18,duplicateStandaloneTokens:0},roads:{output:18,certain:16,independentPieceUnresolved:2,confirmedFalseAdds:0,confirmedOmissions:0,scope:'No obvious unmatched road found in full-photo sweep; ambiguous independence prevents exhaustive true count.'},buildings:{output:14,present:14,modelCityClaims:10,modelSettlementClaims:4,confirmedSubtypeCount:0,unresolvedSubtypeCount:14},robber:{output:1,present:1,hills6Relation:'match'},harbors:{output:9,present:9,typeMatch:7,typeWrong:2,printedRatioMatch:7,printedRatioWrong:1,printedRatioUnresolved:1,exactEndpointPairsSupplied:0,exactEndpointPairsUnverified:9},cards:{output:6,present:6,readableCategoryMatch:4,specificIdentityUnresolved:2,formalFaceSupplied:0},sources:{sameProvidedPhoto:67,targetPresent:65,independentRoadTargetUnresolved:2,cropsWithOtherObjectOrFragmentMinimum:21},ownership:{coloredPieceClaims:32,physicalColorAndConfiguredColorIDMatch:32,unknownColorAssignments:0,scope:'IDs named by four supplied colors; real player identity not established.'}},
 countsByOwner:{roads:byColor('part-3'),buildings:byColor('building')},
 correctionMinimum:{confirmedHarborTypeEdits:2,includingOneRatioEdit:1,possibleRoadDuplicatesOrFalseAdds:2,buildingSubtypeConfirmations:14,endpointConnectionsNeededForC:9,uiCorrectionTimeMs:null},
 notCountedAsOmissions:['Red supply bowl','Outer card racks / hidden hands','Dice','Unseen deck interior','No temporal/player hand facts can be established from this public image'],
 extraPhotoNeeded:['Original-resolution full board photo for small glyphs and intersections','Close-up of upper-right ore ratio and both harbor docks/contact vertices','Clear overhead view of blue-road-2 and white-road-3 to distinguish one molded object from separate road','One known settlement and one known city from this physical set as silhouette references, plus unclear white pieces'],
 targets:review,
};
await writeFile(path.join(here,'full-review.json'),JSON.stringify(result,null,2)+'\n');
console.log('FULL REVIEW: all 67 targets + 12 whole-photo zones; 2 confirmed harbor type mismatches; 2 road and 14 building subtypes unresolved.');
