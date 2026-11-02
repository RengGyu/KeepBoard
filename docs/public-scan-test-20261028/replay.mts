import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {analyzeScanFrame,emptyScanSelector,stepScanSelector,reserveScanFrame,settleScanFrame,SCAN_THRESHOLDS} from '../../src/scanQuality.ts';
const root='/private/tmp/kb-public-scan-video-20261028',size=192*108*4,reports=[];
for(const id of ['detail','overhead']){
 const bytes=await fs.readFile(`${root}/${id}.rgba`);if(bytes.length%size)throw Error('Frame length mismatch');
 let state=emptyScanSelector();const rows=[],selected=[];const start=performance.now();
 for(let i=0;i<bytes.length/size;i++){
  const t=performance.now(),frame=analyzeScanFrame(bytes.subarray(i*size,(i+1)*size),192,108),r=stepScanSelector(state,frame,i*250);state=r.state;
  const row={index:i,atMs:i*250,reason:r.reason,motion:r.motion,mean:frame.mean,contrast:frame.contrast,laplacianVariance:frame.laplacianVariance,localMs:performance.now()-t};rows.push(row);
  if(r.reason==='ready'){const key=id+'-'+i;state=reserveScanFrame(state,frame,key,i*250);state=settleScanFrame(state,key,true);selected.push(row);}
 }
 const report={id,rgbaSHA:createHash('sha256').update(bytes).digest('hex'),sourceSHA:createHash('sha256').update(await fs.readFile(`${root}/catan-${id==='detail'?'detail':'overhead'}.mp4`)).digest('hex'),frames:rows.length,sampleMs:250,selected: selected.map(x=>({index:x.index,atMs:x.atMs,laplacianVariance:x.laplacianVariance})),reasonCounts:rows.reduce((a:any,r)=>(a[r.reason]=(a[r.reason]??0)+1,a),{}),evaluationMs:performance.now()-start,meanSelectorMs:rows.reduce((n,r)=>n+r.localMs,0)/rows.length,maxSelectorMs:Math.max(...rows.map(x=>x.localMs)),rows};
 await fs.writeFile(`${root}/${id}.replay.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600});reports.push(report);console.log(JSON.stringify({...report,rows:undefined}));
}
await fs.writeFile('docs/public-scan-test-20261028/result.json',JSON.stringify({status:'PUBLIC_VIDEO_SELECTOR_REPLAY_ONLY',productEdits:0,modelCalls:0,thresholds:SCAN_THRESHOLDS,sampling:'ffmpeg fps4 +192x108 RGBA; same TS selector as app, not browser Canvas/real-phone performance',reports},null,2)+'\n');
