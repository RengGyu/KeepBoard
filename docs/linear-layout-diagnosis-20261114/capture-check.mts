/** Artifact integrity only. This does not certify screenshot completeness or physical truth. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const out=import.meta.dirname,root=path.resolve(out,'../..');
const base=path.join(root,'docs/photo-service-comparison-20261113');
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const assets=JSON.parse(await fs.readFile(path.join(base,'assets.json'),'utf8'));
const artifacts=[];
for(const a of assets){
 const photo=await fs.readFile(path.join(base,a.photo)),service=await fs.readFile(path.join(base,a.service));
 const original=await fs.readFile(path.join(root,a.sourcePath));
 assert.equal(sha(photo),a.photoSHA256);assert.equal(sha(service),a.serviceSHA256);assert.equal(sha(original),sha(photo));
 const pm=await sharp(photo).metadata(),sm=await sharp(service).metadata();
 artifacts.push({game:a.id,photo:{path:a.photo,sha256:sha(photo),width:pm.width,height:pm.height,identicalToOriginal:true},service:{path:a.service,sha256:sha(service),width:sm.width,height:sm.height},manifestObservations:a.observations});
}
const {data,info}=await sharp(path.join(base,'assets/azul-service.png')).flatten({background:'#fff'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
let darkBefore340=0,darkAtOrAfter340=0,minX=info.width,minY=info.height,maxX=-1,maxY=-1;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 const i=(y*info.width+x)*info.channels;
 if(data[i]<190&&data[i+1]<190&&data[i+2]<190){if(x<340)darkBefore340++;else darkAtOrAfter340++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
}
const productPaths=['src','shared','server','gamepacks','game-photo-definitions','public/game-art'];
const old='65f5526ec4ef7f876d52cd62f6e4e788bc297b91',head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const diffNames=execFileSync('git',['diff','--name-only',old,head,'--',...productPaths],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const result={artifacts,allManifestHashesAndOriginalCopiesMatch:true,productComparison:{captureCommit:old,currentHead:head,paths:productPaths,changedFiles:diffNames},azulRaster:{width:info.width,height:info.height,criterion:'RGB all < 190 after compositing on white; descriptive, not an object detector',darkBefore340,darkAtOrAfter340,darkBounds:{minX,minY,maxX,maxY},meaning:'Corroborates manual inspection: only the upper-left fragment is legible. DOM counts in capture-proof.json cannot establish complete pixels.'},scope:'Existing files and read-only git comparison. No new browser capture, image editing, provider, or accuracy scoring.'};
await fs.writeFile(path.join(out,'capture-check-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({games:artifacts.length,hashesMatch:true,productDiffFiles:diffNames,azulRaster:result.azulRaster},null,2));
