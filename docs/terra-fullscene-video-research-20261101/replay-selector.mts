/** Research-only: imports the real selector; no app/server, uploads or model calls. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {analyzeScanFrame,emptyScanSelector,stepScanSelector,reserveScanFrame,settleScanFrame,sameScanView,SCAN_THRESHOLDS} from '../../src/scanQuality.ts';
const out=path.dirname(new URL(import.meta.url).pathname),tmp=await fs.mkdtemp('/private/tmp/kb-fullscene-selector-');
const source='/private/tmp/kb-static-multiview-20261101',bytesPerFrame=192*108*4;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const reports:any[]=[];
for(const id of ['5335','49721']){
 const file=path.join(source,id+'.mp4'),raw=path.join(tmp,id+'.rgba');
 execFileSync('/opt/homebrew/bin/ffmpeg',['-v','error','-i',file,'-t','5','-vf','fps=4,scale=192:108','-pix_fmt','rgba','-f','rawvideo',raw]);
 const data=await fs.readFile(raw);if(data.length%bytesPerFrame)throw Error('Non-integral video frames');
 let state=emptyScanSelector();const rows:any[]=[],selected:any[]=[];
 for(let i=0;i<data.length/bytesPerFrame;i++){
  const begin=performance.now(),frame=analyzeScanFrame(data.subarray(i*bytesPerFrame,(i+1)*bytesPerFrame),192,108),r=stepScanSelector(state,frame,i*250);state=r.state;
  const row={index:i,atMs:i*250,reason:r.reason,motion:r.motion,laplacianVariance:frame.laplacianVariance,mean:frame.mean,selectorMs:performance.now()-begin};rows.push(row);
  if(r.reason==='ready'){const key=id+'-'+i;state=settleScanFrame(reserveScanFrame(state,frame,key,i*250),key,true);selected.push({index:i,atMs:i*250});}
 }
 reports.push({id,sourceSHA:sha(await fs.readFile(file)),rgbaSHA:sha(data),frames:rows.length,selected,reasonCounts:Object.fromEntries([...new Set(rows.map(r=>r.reason))].map(reason=>[reason,rows.filter(r=>r.reason===reason).length])),meanSelectorMs:rows.reduce((a,b)=>a+b.selectorMs,0)/rows.length,rows});
}
// A stable, sharper version of the same view is still a duplicate. This probes
// control flow only; it is not a realistic optical blur/accuracy benchmark.
const w=192,h=108,sharp=new Uint8Array(w*h*4),soft=new Uint8Array(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const value=((Math.floor(x/8)+Math.floor(y/8))%2?180:70);for(let c=0;c<3;c++)sharp[(y*w+x)*4+c]=value;sharp[(y*w+x)*4+3]=255;
}
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=sharp[(Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx)))*4];
 for(let c=0;c<3;c++)soft[(y*w+x)*4+c]=Math.round(sum/9);soft[(y*w+x)*4+3]=255;
}
const a=analyzeScanFrame(soft,w,h),b=analyzeScanFrame(sharp,w,h);
let s=emptyScanSelector();let reason='';
for(let t=0;t<=1000;t+=250){const r=stepScanSelector(s,a,t);s=r.state;reason=r.reason;}
if(reason==='ready')s=settleScanFrame(reserveScanFrame(s,a,'synthetic-soft',1000),'synthetic-soft',true);
s={...s,previous:null,stableSince:null};const improved=stepScanSelector(s,b,4000);
const synthetic={classification:'SYNTHETIC_CONTROL_FLOW_NOT_GAME_ACCURACY',softLaplacian:a.laplacianVariance,sharpLaplacian:b.laplacianVariance,firstReason:reason,sameView:sameScanView(a.fingerprint,b.fingerprint),sharperLaterReason:improved.reason};
const result={version:'fullscene-selector-replay-v1',modelCalls:0,uploads:0,productChanges:0,sourceSelectorSHA:sha(await fs.readFile('src/scanQuality.ts')),sampling:'ffmpeg first 5 seconds at 4fps/192x108; not Canvas or mobile performance',thresholds:SCAN_THRESHOLDS,reports,synthetic,limits:['Risk samples have shallow focus, partial board and potential unseen state changes.','Chess is camera retreat, not proven multiangle visibility improvement.','No whole-board reference, OCR, correspondence or state certification.','Selection-only CPU excludes ffmpeg, full-resolution encode/upload and browser UI.']};
await fs.writeFile(path.join(out,'selector-replay.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({reports:reports.map(({rows,...r})=>r),synthetic}));
