import {createHash} from 'node:crypto';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {CATAN_TOPOLOGY} from '../../shared/scene';
import {photoFrameTransform,projectPhotoPoint,type ConfirmedPhotoFrame,type PhotoTransform} from '../../shared/photoGeometry';
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
/** One fixed CPU raster helper; no model, downloads, or external calls. Pillow must already be installed. */
export async function buildCatanAtlas(source:Buffer,frame:ConfirmedPhotoFrame):Promise<{data:Buffer;mimeType:'image/png';transform:PhotoTransform}>{
 if(sha(source)!==frame.sourceSHA)throw Error('atlas 원본 사진 해시가 바뀌었습니다.');
 const h=photoFrameTransform(frame),size=192,pad=8,columns=5,panels:PhotoTransform['panels']=[],warps:number[][]=[];
 for(const hex of CATAN_TOPOLOGY.hexes){
  // Only the interior of each confirmed tile. No edge/building ownership or hidden values are inferred.
  const corners=[[-.64,-.64],[.64,-.64],[.64,.64],[-.64,.64]].map(([x,y])=>({x:hex.x+x,y:hex.y+y})),polygon=corners.map(p=>projectPhotoPoint(h.inverseMatrix,p));
  if(polygon.some(p=>p.x<0||p.x>1||p.y<0||p.y>1))continue;
  const i=panels.length,x=pad+(i%columns)*(size+pad),y=pad+Math.floor(i/columns)*(size+pad),inputRectangle={x,y,width:size,height:size};
  const matrix=photoFrameTransform({correspondences:[{x:0,y:0},{x:size,y:0},{x:size,y:size},{x:0,y:size}].map((p,j)=>({photoPointNormalized:p,canonicalPoint:polygon[j]}))} as ConfirmedPhotoFrame).forwardMatrix;
  panels.push({panelRef:'panel-'+i,sourcePolygon:polygon,inputRectangle,candidateSlotId:hex.id});warps.push(matrix);
 }
 if(!panels.length)throw Error('확인한 판 기준점으로 사진 안의 지형 영역을 찾지 못했습니다. 원본 관측을 사용하세요.');
 const width=columns*(size+pad)+pad,height=Math.ceil(panels.length/columns)*(size+pad)+pad;
 const payload=JSON.stringify({image:source.toString('base64'),width,height,size,panels:panels.map((p,i)=>({x:p.inputRectangle.x,y:p.inputRectangle.y,matrix:warps[i]}))});
 const output=await new Promise<Buffer>((resolve,reject)=>{
  const child=spawn('python3',[fileURLToPath(new URL('./catanAtlas.py',import.meta.url))],{stdio:['pipe','pipe','pipe']}),chunks:Buffer[]=[];let length=0,error='';
  const timeout=setTimeout(()=>{child.kill();reject(Error('atlas 변환 시간이 초과했습니다. 원본은 유지됩니다.'));},30000);
  child.stdout.on('data',(b:Buffer)=>{length+=b.length;if(length>10000000){child.kill();reject(Error('atlas 출력 크기를 확인하세요.'));}else chunks.push(b);});child.stderr.on('data',(b:Buffer)=>{error+=b.toString().slice(0,500);});child.on('error',()=>{clearTimeout(timeout);reject(Error('로컬 atlas 변환기(Python/Pillow)가 준비되지 않았습니다. 원본 관측은 사용할 수 있습니다.'));});
  child.on('close',code=>{clearTimeout(timeout);if(code===0)resolve(Buffer.concat(chunks));else reject(Error('로컬 atlas 변환 실패: '+error.slice(-500)));});child.stdin.on('error',()=>{});child.stdin.end(payload);
 });
 const decoded=JSON.parse(output.toString()),data=Buffer.from(decoded.png,'base64');
 if(data.length<24||data.subarray(1,4).toString()!=='PNG'||data.readUInt32BE(16)!==width||data.readUInt32BE(20)!==height)throw Error('atlas 이미지 출력 크기가 고정한 변환과 다릅니다.');
 const inputSHA=sha(data),transform:PhotoTransform={transformId:'catan-atlas-'+sha(JSON.stringify({frame,panels})).slice(0,24),sourceSHA:frame.sourceSHA,inputSHA,sourceDimensions:decoded.sourceDimensions,inputDimensions:{width,height},forwardMatrix:h.forwardMatrix,inverseMatrix:h.inverseMatrix,panels:panels.map(p=>({...p,inputRectangle:{x:p.inputRectangle.x/width,y:p.inputRectangle.y/height,width:p.inputRectangle.width/width,height:p.inputRectangle.height/height}}))};
 return {data,mimeType:'image/png',transform};
}
