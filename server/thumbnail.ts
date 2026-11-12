import sharp from 'sharp';
/** Best effort, first frame, auto-orient, no metadata: never replace or mutate original bytes. */
export async function thumbnailJPEG(bytes:Buffer):Promise<Buffer|undefined>{
 try{return await sharp(bytes,{animated:false}).rotate().resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:78}).toBuffer();}catch{return undefined;}
}
export function thumbnailName(filename:string){return filename+'.thumb.jpg';}
