import type {Evidence,SessionView} from '../shared/types';
import type {HostedReaderSelection} from '../shared/lightweightRecognition';
import type {PhotoInput} from './Capture';
import {api} from './api';

/** Original pixel boundaries only: no resize, padding, upscale or whole-photo fallback. */
export function sourceCropPixels(region:NonNullable<PhotoInput['sourceRegion']>,width:number,height:number,allowWhole=false){
 if(![region.x,region.y,region.width,region.height,width,height].every(Number.isFinite)||width<=0||height<=0||region.x<0||region.y<0||region.width<=0||region.height<=0||region.x+region.width>1.00000001||region.y+region.height>1.00000001)throw Error('원사진의 선택 영역을 확인해 주세요.');
 const snap=(n:number)=>Math.abs(n-Math.round(n))<=Number.EPSILON*Math.max(1,Math.abs(n))*8?Math.round(n):n;
 const x=Math.floor(snap(region.x*width)),y=Math.floor(snap(region.y*height)),w=Math.min(width,Math.ceil(snap((region.x+region.width)*width)))-x,h=Math.min(height,Math.ceil(snap((region.y+region.height)*height)))-y;
 if(w<=0||h<=0||!allowWhole&&w===width&&h===height)throw Error('다시 읽을 부분만 선택해 주세요.');
 return {x,y,width:w,height:h,sourceRegion:{x:x/width,y:y/height,width:w/width,height:h/height}};
}

/** Uses the existing commit/claim path; only the new registered crop is submitted. */
export async function rereadPhotoRegion({sessionId,epoch,ownerId,source,input,reader,requestId,current,flush,mutate}:{
 sessionId:string;epoch:string;ownerId?:string;source:Evidence;input:PhotoInput;reader:HostedReaderSelection;requestId:string;current:()=>boolean;flush:()=>Promise<void>;mutate:(task:()=>Promise<SessionView>)=>Promise<unknown>;
}){
 const guard=()=>{if(!current())throw Error('지난 사진·화면의 요청은 시작하지 않았어요.');};
 guard();
 if(source.kind!=='photo'||source.sourceEvidenceId||source.captureEpoch!==epoch||source.ownerId!==ownerId||source.scope!==(ownerId?'player':'public')||!input.sourceRegion||!input.width||!input.height)throw Error('현재 범위의 원사진과 선택 영역을 확인해 주세요.');
 // Metadata must describe exactly the chosen input, not a synthetic full-image read.
 sourceCropPixels(input.sourceRegion,source.width??input.width/input.sourceRegion.width,source.height??input.height/input.sourceRegion.height);
 await flush();guard();let cropId:string|undefined;
 await mutate(async()=>{guard();const saved=await api.evidence(sessionId,{...input,scope:source.scope,ownerId,sourceEvidenceId:source.id,expectedCaptureEpoch:epoch});
  const crop=saved.session.evidence.find(e=>e.id===saved.createdEvidenceId);if(!crop||crop.captureEpoch!==epoch||crop.ownerId!==ownerId||crop.scope!==source.scope)throw Error('부분사진 저장 식별자를 확인하지 못했어요.');cropId=crop.id;return saved;});
 guard();let saved:SessionView|undefined;
 await mutate(async()=>{guard();saved=await api.commit(sessionId,true,{reader,evidenceIds:[cropId!]},ownerId);return saved;});
 guard();if(!saved?.saveIntentId)throw Error('부분사진은 보관했어요. 판독 저장 연결을 확인해 주세요.');
 return api.startAnalysisJob(sessionId,{requestId: saved.saveIntentId||requestId,saveIntentId:saved.saveIntentId,evidenceIds:[cropId!],expectedCaptureEpoch:epoch,reader,scope:ownerId?'owner':'public',ownerId,purpose:'capture',sameStaticState:true});
}
