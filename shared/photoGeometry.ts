export interface GeometryPoint {x:number;y:number}
export interface ConfirmedPhotoFrame {frameId:string;sourceEvidenceId:string;sourceSHA:string;definitionSHA:string;coordinateSpace:'normalized-photo/catan-topology';correspondences:{photoPointNormalized:GeometryPoint;canonicalPoint:GeometryPoint;canonicalTopologyId:string}[];orientation:number;confirmedByUser:true}
export interface PhotoTransform {transformId:string;sourceSHA:string;inputSHA:string;sourceDimensions:{width:number;height:number};inputDimensions:{width:number;height:number};forwardMatrix:number[];inverseMatrix:number[];panels:{panelRef:string;sourcePolygon:GeometryPoint[];inputRectangle:{x:number;y:number;width:number;height:number};candidateSlotId:string}[]}
export interface PhotoFrameContext {evidenceId:string;sourceSHA:string;definitionSHA:string}
export interface FrameHomography {forwardMatrix:number[];inverseMatrix:number[]}
import {CATAN_TOPOLOGY} from './scene';
import type {ObservationRequest,ObservationResult,LiteralObservation,ObservationBox,GeometryCandidate} from './lightweightRecognition';
const invalid=():never=>{throw new Error('사진 frame/좌표 대응을 확인하세요. 원본과 미배치 후보는 유지됩니다.');};
const finite=(p:GeometryPoint)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function projectPhotoPoint(matrix:readonly number[],point:GeometryPoint):GeometryPoint {if(matrix.length!==9||!matrix.every(Number.isFinite)||!finite(point))return invalid();const d=matrix[6]*point.x+matrix[7]*point.y+matrix[8];if(Math.abs(d)<1e-10)return invalid();return {x:(matrix[0]*point.x+matrix[1]*point.y+matrix[2])/d,y:(matrix[3]*point.x+matrix[4]*point.y+matrix[5])/d};}
function solve(a:number[][],b:number[]){const n=b.length,m=a.map((r,i)=>[...r,b[i]]);for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(m[j][i])>Math.abs(m[p][i]))p=j;if(Math.abs(m[p][i])<1e-10)return invalid();[m[i],m[p]]=[m[p],m[i]];const d=m[i][i];for(let k=i;k<=n;k++)m[i][k]/=d;for(let j=0;j<n;j++)if(j!==i){const f=m[j][i];for(let k=i;k<=n;k++)m[j][k]-=f*m[i][k];}}return m.map(r=>r[n]);}
function inverse(m:number[]){const[a,b,c,d,e,f,g,h,i]=m,det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);if(!Number.isFinite(det)||Math.abs(det)<1e-10)return invalid();return [(e*i-f*h),(c*h-b*i),(b*f-c*e),(f*g-d*i),(a*i-c*g),(c*d-a*f),(d*h-e*g),(b*g-a*h),(a*e-b*d)].map(x=>x/det);}
export function photoFrameTransform(frame:ConfirmedPhotoFrame):FrameHomography {
 if(!Array.isArray(frame.correspondences)||frame.correspondences.length<4||frame.correspondences.length>40)return invalid();const rows:number[][]=[],rhs:number[]=[];
 for(const c of frame.correspondences){if(!finite(c.photoPointNormalized)||!finite(c.canonicalPoint))return invalid();const {x,y}=c.photoPointNormalized,{x:u,y:v}=c.canonicalPoint;rows.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);rhs.push(u,v);}
 const normal=Array.from({length:8},(_,i)=>Array.from({length:8},(_,j)=>rows.reduce((n,r)=>n+r[i]*r[j],0))),right=Array.from({length:8},(_,i)=>rows.reduce((n,r,j)=>n+r[i]*rhs[j],0)),forwardMatrix=[...solve(normal,right),1],inverseMatrix=inverse(forwardMatrix);
 for(const c of frame.correspondences){const p=projectPhotoPoint(forwardMatrix,c.photoPointNormalized);if(Math.hypot(p.x-c.canonicalPoint.x,p.y-c.canonicalPoint.y)>.1)return invalid();}
 return {forwardMatrix,inverseMatrix};
}
export function validatePhotoFrame(raw:unknown,context:PhotoFrameContext):ConfirmedPhotoFrame {
 const f=raw as ConfirmedPhotoFrame;if(!f||typeof f!=='object'||Object.keys(f).some(k=>!['frameId','sourceEvidenceId','sourceSHA','definitionSHA','coordinateSpace','correspondences','orientation','confirmedByUser'].includes(k))||!f.frameId||f.sourceEvidenceId!==context.evidenceId||f.sourceSHA!==context.sourceSHA||f.definitionSHA!==context.definitionSHA||f.coordinateSpace!=='normalized-photo/catan-topology'||f.confirmedByUser!==true||!Number.isFinite(f.orientation)||!Array.isArray(f.correspondences))return invalid();
 const ids=new Set<string>();for(const c of f.correspondences){const p=c.photoPointNormalized,canonical=CATAN_TOPOLOGY.byId.hex.get(c.canonicalTopologyId)??CATAN_TOPOLOGY.byId.vertex.get(c.canonicalTopologyId)??CATAN_TOPOLOGY.byId.edge.get(c.canonicalTopologyId);if(!canonical||ids.has(c.canonicalTopologyId)||!finite(p)||p.x<0||p.x>1||p.y<0||p.y>1||!finite(c.canonicalPoint)||Math.hypot(canonical.x-c.canonicalPoint.x,canonical.y-c.canonicalPoint.y)>1e-6)return invalid();ids.add(c.canonicalTopologyId);}
 photoFrameTransform(f);return structuredClone(f);
}
export function mapObservationRegion(o:LiteralObservation,request:ObservationRequest,transforms:PhotoTransform[]):ObservationBox|null {
 if(!o.bbox)return null;const image=request.images[o.imageIndex];if(!image)return invalid();if(!image.transformId){if(o.panelRef!==null)return invalid();return {...o.bbox};}
 const t=transforms.find(t=>t.transformId===image.transformId&&t.inputSHA===image.sha256);if(!t)return invalid();const b=o.bbox,rect=o.panelRef?t.panels.find(p=>p.panelRef===o.panelRef):undefined;let points:GeometryPoint[];
 if(rect){const r=rect.inputRectangle;if(b.x<r.x-1e-7||b.y<r.y-1e-7||b.x+b.width>r.x+r.width+1e-7||b.y+b.height>r.y+r.height+1e-7||rect.sourcePolygon.length!==4)return invalid();const corners=[{x:r.x,y:r.y},{x:r.x+r.width,y:r.y},{x:r.x+r.width,y:r.y+r.height},{x:r.x,y:r.y+r.height}],matrix=photoFrameTransform({correspondences:corners.map((p,i)=>({photoPointNormalized:p,canonicalPoint:rect.sourcePolygon[i]}))} as ConfirmedPhotoFrame).forwardMatrix;points=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>projectPhotoPoint(matrix,{x,y}));}
 else{if(o.panelRef!==null||t.panels.length)return invalid();points=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>projectPhotoPoint(t.inverseMatrix,{x,y}));}
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),width=Math.max(...xs)-x,height=Math.max(...ys)-y;if(x<0||y<0||x+width>1.0000001||y+height>1.0000001||width<=0||height<=0)return invalid();return {x,y,width,height};
}
export function geometryCandidates(request:ObservationRequest,result:ObservationResult,frame:ConfirmedPhotoFrame,transforms:PhotoTransform[]=[]):GeometryCandidate[] {
 if(request.gameId!=='catan')return [];const image=request.images[0],t=transforms.find(t=>t.transformId===image.transformId),f=validatePhotoFrame(frame,{evidenceId:image.evidenceId,sourceSHA:t?.sourceSHA??image.sha256,definitionSHA:request.definitionSHA}),h=photoFrameTransform(f),out:GeometryCandidate[]=[];
 for(const o of result.observations){if(!['terrain','number-token','robber'].includes(o.componentId??''))continue;const b=mapObservationRegion(o,request,transforms);if(!b)continue;const p=projectPhotoPoint(h.forwardMatrix,{x:b.x+b.width/2,y:b.y+b.height/2}),nearest=[...CATAN_TOPOLOGY.hexes].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(Math.hypot(nearest.x-p.x,nearest.y-p.y)>.6)continue;out.push({observationRef:o.ref,frameId:f.frameId,locationCandidate:{type:'hex',id:nearest.id},method:'confirmed-frame',status:'candidate'});}
 return out;
}
