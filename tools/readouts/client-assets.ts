import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {Plugin} from 'vite';
import {gameDataKey,gameDataPath,matchesReadout} from '../../shared/readouts/identity';
import type {GamePack} from '../../shared/types';
import type {GameReadoutDefinition} from '../../shared/readouts/types';
/** Build-time only. Original JSONs stay unchanged; each URL contains one exact game/version. */
export async function gameDataAssets(root=process.cwd()){
 const json=async(p:string)=>JSON.parse(await readFile(path.join(root,p),'utf8'));
 const current=Object.assign({},...await Promise.all((await readdir(path.join(root,'shared/readouts/catalogs'))).filter(f=>f.endsWith('.json')).sort().map(f=>json('shared/readouts/catalogs/'+f)))) as Record<string,GameReadoutDefinition>,retired=await json('shared/readouts/retired.json');
 const old='docs/gamepack-revision-20261026/history/before-runtime-revision/';
 const photos=[await json('game-photo-definitions/index.json'),await json(old+'game-photo-definitions/index.json')],profiles=[await json('shared/capture-profiles.json'),await json(old+'shared/capture-profiles.json')];
 const assets=new Map<string,{source:string;sha256:string;gameId:string;generation:string;key:string}>();
 for(let i=0;i<photos.length;i++)for(const photo of photos[i].games){
  const pack={id:photo.packId,version:photo.packVersion,runtime:{source:{gameId:photo.gameId,editionId:photo.editionId,sha256:photo.sourceSHA}}} as GamePack;
  const readout=[current[photo.gameId],retired[photo.gameId]].find(d=>matchesReadout(d,pack))??null;
  const capture=profiles.map(p=>p[photo.gameId]).find(p=>p&&p.packId===pack.id&&p.editionId===photo.editionId&&p.sourceSHA===photo.sourceSHA)??null;
  const generation=i?'retired':'current',source=JSON.stringify({version:1,photo,readout,capture,generation}),url=gameDataPath(pack);
  if(assets.has(url)){if(assets.get(url)!.key!==gameDataKey(pack))throw Error('Conflicting pinned game identity: '+photo.gameId);continue;} // Exact overlap follows the existing current-before-retired lookup.
  assets.set(url,{source,key:gameDataKey(pack),sha256:createHash('sha256').update(source).digest('hex'),gameId:photo.gameId,generation});
 }
 return assets;
}
export function selectedGameData():Plugin{
 let root=process.cwd();let assets:Awaited<ReturnType<typeof gameDataAssets>>;
 return {name:'keepboard-selected-game-data',enforce:'pre',configResolved(c){root=c.root;},
  resolveId(source,importer){
   const from=importer?.split('?')[0].replaceAll('\\','/');
   if(source==='./dataSource.ts'&&from?.endsWith('/shared/readouts/registry.ts'))return path.join(root,'src/gameData.ts');
   if(from?.endsWith('/shared/photoCapture.ts')&&source.endsWith('capture-profiles.json'))return '\0capture-profile-'+(source.startsWith('./')?'current':'retired');
   if(source==='./photoDefinitionSource'&&from?.endsWith('/src/photoDefinitions.ts'))return path.join(root,'src/gameData.ts');
   if(source==='./nativeScreens'&&from?.startsWith(root+'/src/'))return path.join(root,'src/nativeScreens.client.tsx');
  },
  load(id){if(id.startsWith('\0capture-profile-'))return `export {captureProfile${id.endsWith('current')?'Current':'Retired'} as default} from ${JSON.stringify(path.join(root,'src/gameData.ts'))};`;},
  async buildStart(){assets=await gameDataAssets(root);},
  async configureServer(server){const devAssets=await gameDataAssets(root);server.middlewares.use((req,res,next)=>{const entry=devAssets.get(req.url?.split('?')[0]??'');if(!entry)return next();res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-cache');res.end(entry.source);});},
  generateBundle(){for(const [url,data]of assets)this.emitFile({type:'asset',fileName:url.slice(1),source:data.source});}
 };
}
