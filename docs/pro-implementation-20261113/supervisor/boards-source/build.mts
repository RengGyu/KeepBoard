import {build} from 'vite';
import {selectedGameData,gameDataAssets} from '../../../../tools/readouts/client-assets.ts';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const repo=process.cwd(),source=path.resolve('docs/pro-implementation-20261113/supervisor/boards-source'),out='/private/tmp/kb-pro-implementation-boards-20261113';
const input=path.join(repo,'docs/pro-review-20261113'),caseFiles=(await import('node:fs/promises')).readdir;
const cases=[] as any[];
for(const filename of (await caseFiles(path.join(input,'data/cases'))).filter(f=>f.endsWith('.json')).sort()){
 const bytes=await readFile(path.join(input,'data/cases',filename)),saved=JSON.parse(bytes.toString()),pack=JSON.parse(await readFile(path.join(input,'data/packs',saved.gameId+'.json'),'utf8'));
 const assertions=saved.assertions.map((a:any)=>{const {observationReceiptRefs,...rest}=a;return {...rest,observationReceipts:observationReceiptRefs.map((i:number)=>saved.receipts[i])};});
 cases.push({id:saved.gameId,dataId:saved.caseId,bytes,saved,pack,assertions,provenance:'기존 저장 응답 · 현재 제품 관계 복원 코드 · 새 판독 없음'});
}
const loader=selectedGameData(),configure=loader.configResolved as Function;
loader.configResolved=function(c:any){configure.call(this,{...c,root:repo});};
loader.generateBundle=async function(){for(const [url,a] of await gameDataAssets(repo))if(cases.some(c=>c.id===a.gameId))this.emitFile({type:'asset',fileName:url.slice(1),source:a.source});};
await build({root:source,configFile:false,base:'/boards/',publicDir:false,plugins:[loader,{name:'readonly-site-paths',enforce:'pre',transform(code,id){if(id.startsWith(repo+'/src/'))return code.replaceAll('/game-art/','/boards/game-art/').replaceAll('/game-data/','/boards/game-data/');}}],resolve:{dedupe:['react','react-dom']},build:{outDir:out,emptyOutDir:true}});
await mkdir(path.join(out,'data'),{recursive:true});await mkdir(path.join(out,'photos'),{recursive:true});
const provenance:any[]=[];
for(const c of cases){
 const image=await readFile(path.join(input,'photos',c.id+'.jpg'));
 const photos=c.saved.photos.map((e:any)=>({...e,url:`./photos/${c.id}.jpg`,thumbnailUrl:undefined}));
 const data={pack:c.pack,photos,assertions:c.assertions,playerCount:c.saved.playerCount,provenance:c.provenance};
 await writeFile(path.join(out,'data',c.dataId+'.json'),JSON.stringify(data));await writeFile(path.join(out,'photos',c.id+'.jpg'),image);
 provenance.push({gameId:c.id,dataId:c.dataId,source:'docs/pro-review-20261113/data/cases/'+c.dataId+'.json',sourceSHA256:createHash('sha256').update(c.bytes).digest('hex'),photoSHA256:createHash('sha256').update(image).digest('hex'),packId:c.pack.id,packVersion:c.pack.version,sourceSHA:c.pack.runtime.source.sha256,provenance:c.provenance});
}
const artRoot=path.join(repo,'public/game-art'),assetIndex=JSON.parse(await readFile(path.join(artRoot,'assets.json'),'utf8')),mapping=JSON.parse(await readFile(path.join(artRoot,'boards/mapping.json'),'utf8'));
await mkdir(path.join(out,'game-art/boards'),{recursive:true});await writeFile(path.join(out,'game-art/boards/mapping.json'),JSON.stringify({...mapping,games:mapping.games.filter((g:any)=>cases.some(c=>c.id===g.gameId))}));
const ids=new Set<string>(['common.unknown','common.card-shell','common.area-zone','common.cube','common.token-shell']);
for(const c of cases){
 const mapFile=`games/${c.id}/mapping.json`,m=JSON.parse(await readFile(path.join(artRoot,mapFile),'utf8'));
 await mkdir(path.dirname(path.join(out,'game-art',mapFile)),{recursive:true});await cp(path.join(artRoot,mapFile),path.join(out,'game-art',mapFile));
 for(const component of m.components)for(const l of [...(component.hidden_layers??[]),...component.variants.flatMap((v:any)=>v.layers??[])])ids.add(l.asset_id);
 await cp(path.join(artRoot,'real-boards',c.id),path.join(out,'game-art/real-boards',c.id),{recursive:true});
}
const assets=assetIndex.assets.filter((a:any)=>ids.has(a.asset_id));await writeFile(path.join(out,'game-art/assets.json'),JSON.stringify({...assetIndex,assets}));
for(const a of assets){const relative=a.file.replace(/^public\//,''),dest=path.join(out,a.classification==='existing'?relative:'game-art/'+relative),from=path.join(a.classification==='existing'?path.join(repo,'public'):artRoot,relative);await mkdir(path.dirname(dest),{recursive:true});await cp(from,dest);}
const productFiles:Record<string,string>={};
for(const file of ['src/GameBoardRecord.tsx','src/EstimatedBoardView.tsx','src/estimated-board.css','shared/estimatedBoardStructure.ts','shared/structureRelations.ts','shared/estimatedGeometry.ts','shared/estimatedStructureOverride.ts','shared/estimatedStructureSafety.ts'])productFiles[file]=createHash('sha256').update(await readFile(path.join(repo,file))).digest('hex');
await writeFile(path.join(out,'source.json'),JSON.stringify({builtAt:new Date().toISOString(),readonly:true,productBaseline:'d7e6d098116659b727dae50a8ae204b1ab566aae',productFiles,renderer:'current src/GameBoardRecord.tsx + existing PhotoLayoutBoard/GenericPieceArt/GameDetailReadout',pathAdapter:'only site URL base /boards; runtime source unchanged',cases:provenance},null,2));
console.log(JSON.stringify({out,cases:provenance.map(c=>c.dataId)}));
