// Reconstruct editable SVG layers from read-only browser layout observations.
// Text remains text; existing SVG artwork is embedded as vector shapes. No screenshots embedded.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'..');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const round=n=>Math.round(n*100)/100;
let generated=0;
for(const filename of fs.readdirSync(dir).filter(x=>x.endsWith('.layout.json'))){
 const data=JSON.parse(fs.readFileSync(path.join(dir,filename),'utf8'));let count=0;
 let out=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${data.width}" height="${data.height}" viewBox="0 0 ${data.width} ${data.height}"><title>KeepBoard ${esc(data.title)} — editable reference</title><desc>HTML rendered layout converted to vector layers. Text is editable. Not a Figma file or auto-layout component system.</desc><defs><clipPath id="screen-clip"><rect width="${data.width}" height="${data.height}"/></clipPath></defs><g clip-path="url(#screen-clip)"><rect width="100%" height="100%" fill="#fcfdf9"/>`;
 for(const item of data.items){count++;const {x,y,w,h}=item;
 if(item.kind==='box'){out+=`<rect id="layer-${count}" x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${Math.min(parseFloat(item.radius)||0,w/2,h/2)}" fill="${esc(item.bg==='rgba(0, 0, 0, 0)'?'none':item.bg)}" stroke="${esc(item.borderColor)}" stroke-width="${item.borderWidth||0}"/>`;}
 if(item.kind==='text'){out+=`<text id="text-${count}" x="${round(x)}" y="${round(y+item.fontSize*.82)}" font-family="${esc(item.fontFamily)}" font-size="${item.fontSize}" font-weight="${item.fontWeight}" letter-spacing="${item.letterSpacing==='normal'?'0':item.letterSpacing}" fill="${esc(item.color)}">${esc(item.text)}</text>`;}
 if(item.kind==='image'){
  const assetPath=new URL(item.src).pathname.replace(/^\//,'');if(!assetPath.startsWith('assets/'))continue;
  const file=path.join(root,assetPath);if(!fs.existsSync(file))continue;
  let raw=fs.readFileSync(file,'utf8').trim();const vb=raw.match(/viewBox="([^"]+)"/)?.[1]||'0 0 120 120';raw=raw.replace(/var\(--[^,]+,\s*([^)]+)\)/g,'$1');raw=raw.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'').replace(/<title>[\s\S]*?<\/title>/g,'');
  const prefix='art-'+count+'-';raw=raw.replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix+id}"`).replace(/url\(#([^)]*)\)/g,(_,id)=>`url(#${prefix+id})`);
  const bw=item.layoutWidth||w,bh=item.layoutHeight||h,cx=x+w/2,cy=y+h/2;
  const transform=item.transform&&item.transform!=='none'?item.transform:'';
  out+=`<g id="art-${count}" transform="translate(${round(cx)} ${round(cy)}) ${transform}"><svg x="${-bw/2}" y="${-bh/2}" width="${bw}" height="${bh}" viewBox="${vb}">${raw}</svg></g>`;
 }
 if(item.kind==='icon'){let inner=item.markup.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');out+=`<svg id="icon-${count}" x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" viewBox="0 0 24 24" fill="none" stroke="${esc(item.color)}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;}
 if(item.kind==='check'){out+=`<circle cx="${round(x+w-2)}" cy="${round(y+3)}" r="9" fill="#234d3c" stroke="white" stroke-width="1.5"/><path d="m${round(x+w-6)} ${round(y+3)} 3 3 5-6" stroke="white" stroke-width="1.3" fill="none"/>`;}
 }
 out+='</g></svg>';fs.writeFileSync(path.join(dir,filename.replace('.layout.json','.svg')),out);generated++;
}
console.log(`Exported ${generated} editable SVG screens.`);
