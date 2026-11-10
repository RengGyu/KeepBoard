import {cp,mkdir,readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';

/** Runtime URL closure: mapping assets, generic surfaces, and board/variant dependencies.
 * Source previews, download archives and audit-only JSON stay on disk, outside the build. */
export async function runtimeGameArtFiles(publicRoot:string){
 const root=path.join(publicRoot,'game-art'),keep=new Set<string>();
 const add=(file:string)=>{const clean=file.split('#')[0].replace(/^\.\//,'');if(path.isAbsolute(clean)||clean.split('/').includes('..'))throw Error('Invalid runtime art path: '+file);keep.add(clean);};
 const json=async(file:string)=>JSON.parse(await readFile(path.join(root,file),'utf8'));
 add('assets.json');
 for(const asset of (await json('assets.json')).assets)if(asset.classification!=='existing')add(asset.file);
 for(const entry of await readdir(path.join(root,'games'),{withFileTypes:true}))if(entry.isDirectory())add(`games/${entry.name}/mapping.json`);
 add('boards/mapping.json');
 for(const file of await readdir(path.join(root,'boards')))if(file.endsWith('.svg'))add('boards/'+file);
 const board=async(file:string,dir:string)=>{
  if(keep.has(file))return;add(file);const data=await json(file);
  if(typeof data.svg==='string')add(path.posix.join(dir,data.svg));
  for(const v of data.variants??[]){if(v.svg)add(path.posix.join(dir,v.svg));if(v.json)await board(path.posix.join(dir,v.json),dir);}
 };
 for(const entry of await readdir(path.join(root,'real-boards'),{withFileTypes:true}))if(entry.isDirectory()){
  const dir='real-boards/'+entry.name;await board(dir+'/board.json',dir);
  try{await stat(path.join(root,dir,'pieces.svg'));add(dir+'/pieces.svg');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 }
 // Keep explicit source URLs used by representative thumbnails and native tiles.
 const thumbs=JSON.parse(await readFile(path.join(publicRoot,'../src/gameThumbs.json'),'utf8'));
 for(const url of Object.values(thumbs) as string[])if(url.startsWith('/game-art/'))add(url.slice('/game-art/'.length));
 for(const file of keep)await stat(path.join(root,file));
 return keep;
}
export async function copyRuntimePublic(publicRoot:string,outDir:string){
 const gameArt=await runtimeGameArtFiles(publicRoot);await mkdir(outDir,{recursive:true});
 await cp(publicRoot,outDir,{recursive:true,filter:source=>{
  const relative=path.relative(publicRoot,source).split(path.sep).join('/');
  if(!relative.startsWith('game-art/'))return true;
  const file=relative.slice('game-art/'.length);
  return gameArt.has(file)||[...gameArt].some(p=>p.startsWith(file+'/'));
 }});
}
