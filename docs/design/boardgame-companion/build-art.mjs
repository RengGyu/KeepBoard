import { readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(root,'../../..');
const source=readFileSync(path.join(repo,'src/ComponentArt.tsx'),'utf8').replace("import './component-art.css';",'');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};new Function('exports','require',compiled)(exports,createRequire(import.meta.url));
const art=(props)=>renderToStaticMarkup(React.createElement(exports.ComponentArt,props));
const colors={red:'#B9503F',blue:'#376F94',gold:'#B38B35',green:'#557553'};
const variants=['forest','pasture','hills','fields','mountains','desert'];
const assets={};
function save(name,props){assets[name]=art(props);writeFileSync(path.join(root,'assets',name+'.svg'),assets[name]);}
for(const variant of variants)save('terrain-'+variant,{kind:'terrain',variant});
for(const variant of ['lumber','brick','wool','grain','ore'])save('card-'+variant,{kind:'resource-card',variant});
for(const variant of ['knight','victory-point','road-building'])save('dev-'+variant,{kind:'development-card',variant});
for(const [color,value] of Object.entries(colors))for(const kind of ['road','settlement','city'])save(kind+'-'+color,{kind,color:value});
for(const kind of ['robber','deck','token','harbor'])save(kind,{kind,variant:kind==='harbor'?'generic':undefined,number:kind==='harbor'?3:undefined});
save('number-8',{kind:'number-token',number:8});
for(const name of readdirSync(path.join(repo,'public/carcassonne-art')))if(name.endsWith('.svg'))copyFileSync(path.join(repo,'public/carcassonne-art',name),path.join(root,'assets',name));
const inner=(svg)=>svg.trim().replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'').replace(/<title>.*?<\/title>/g,'');
const hexes=[],vertices=[],edges=[],vmap=new Map(),emap=new Map();
let idx=0;const types=['forest','pasture','fields','hills','mountains','forest','fields','pasture','hills','desert','mountains','pasture','forest','fields','hills','fields','mountains','pasture','forest'];
const nums=[10,2,9,12,6,4,8,5,3,null,11,4,9,10,5,6,3,11,8];
for(let r=-2;r<=2;r++)for(let q=Math.max(-2,-r-2);q<=Math.min(2,-r+2);q++){
 const x=340+Math.sqrt(3)*50*(q+r/2),y=310+75*r;const h={id:'tile-'+idx,x,y,variant:types[idx],number:nums[idx]};hexes.push(h);idx++;
 const points=Array.from({length:6},(_,i)=>{const a=(-90+i*60)*Math.PI/180;return{x:x+50*Math.cos(a),y:y+50*Math.sin(a)}});
 for(let i=0;i<6;i++){const p=points[i],z=points[(i+1)%6],key=[p.x.toFixed(1),p.y.toFixed(1)].join(',');if(!vmap.has(key)){vmap.set(key,vertices.length);vertices.push({id:'v'+vertices.length,...p});}
 const ekey=[key,[z.x.toFixed(1),z.y.toFixed(1)].join(',')].sort().join('|');if(!emap.has(ekey)){emap.set(ekey,edges.length);edges.push({id:'e'+edges.length,x:(p.x+z.x)/2,y:(p.y+z.y)/2,angle:Math.atan2(z.y-p.y,z.x-p.x)*180/Math.PI});}}
}
const picks=[['settlement','red','v3'],['settlement','blue','v14'],['city','gold','v23'],['settlement','green','v40'],['settlement','red','v46'],['settlement','blue','v48'],['road','red','e2'],['road','red','e7'],['road','blue','e17'],['road','blue','e26'],['road','gold','e30'],['road','gold','e37'],['road','green','e52'],['road','green','e62']];
const pieces=picks.map(([kind,owner,slot],i)=>{const p=(kind==='road'?edges:vertices).find(x=>x.id===slot);return{...p,id:'piece-'+i,kind,owner,slot};});
// The sample is an illustration for UI review, not a rules-valid saved session.
function board(withPieces=true){let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 620"><title>카탄 예시 보드</title><path d="M340 37 576 174V446L340 583 104 446V174Z" fill="#D6E6E6" stroke="#A9C2C1" stroke-width="3"/>';
 for(let i=0;i<9;i++){const a=(-90+i*40)*Math.PI/180,x=340+241*Math.cos(a),y=310+241*Math.sin(a);s+=`<g transform="translate(${x-18} ${y-18}) scale(.3)">${inner(assets.harbor)}</g>`;}
 for(const h of hexes){s+=`<g transform="translate(${h.x-62.5} ${h.y-62.5}) scale(1.04167)">${inner(assets['terrain-'+h.variant])}</g>`;if(h.number)s+=`<circle cx="${h.x}" cy="${h.y+13}" r="19" fill="#fff6df" stroke="#6d6c4e"/><text x="${h.x}" y="${h.y+21}" text-anchor="middle" font-family="Georgia,serif" font-size="24" font-weight="700" fill="${[6,8].includes(h.number)?'#A63B2B':'#283D34'}">${h.number}</text>`;}
 if(withPieces)for(const p of pieces){const k=p.kind==='road'?60:48;s+=`<g transform="translate(${p.x} ${p.y}) rotate(${p.kind==='road'?p.angle:0}) translate(${-k/2} ${-k/2}) scale(${k/120})">${inner(assets[p.kind+'-'+p.owner])}</g>`;}
 s+=`<g transform="translate(319 273) scale(.35)">${inner(assets.robber)}</g></svg>`;return s;}
writeFileSync(path.join(root,'assets/catan-board.svg'),board());writeFileSync(path.join(root,'assets/catan-base.svg'),board(false));
const tileNames=['tile-city-cap','tile-road-straight','tile-monastery','tile-field','tile-city-road','tile-road-bend','tile-road-junction','tile-city-corner','tile-monastery-road','tile-field','tile-road-straight','tile-city-cap'];
let carc='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 420"><title>카르카손 예시 보드</title>';
tileNames.forEach((name,i)=>{const raw=readFileSync(path.join(root,'assets',name+'.svg'),'utf8');const vb=raw.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);carc+=`<g transform="translate(${32+(i%4)*114} ${35+Math.floor(i/4)*114}) scale(${112/vb[2]})">${inner(raw).replaceAll('cc-_R_0_', 'cc-tile-'+i)}</g>`;});
for(const [color,x,y] of [['red',95,91],['blue',317,213],['gold',432,327]]){const raw=readFileSync(path.join(root,'assets','follower-standing-'+color+'.svg'),'utf8');const w=Number(raw.match(/viewBox="([^"]+)"/)[1].split(' ')[2]);carc+=`<g transform="translate(${x-18} ${y-18}) scale(${36/w})">${inner(raw)}</g>`;}carc+='</svg>';
writeFileSync(path.join(root,'assets/carcassonne-board.svg'),carc);
writeFileSync(path.join(root,'art-data.js'),'window.KB_ART='+JSON.stringify({hexes,vertices,edges,pieces,colors})+';\n');
console.log('Reused ComponentArt and Carcassonne SVGs; '+hexes.length+' hexes, '+vertices.length+' vertices, '+edges.length+' edges.');
