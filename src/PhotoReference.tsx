import type {Assertion,Evidence} from '../shared/types';
/** A view of original pixels; rendering never crops, edits or stores a new image. */
export function PhotoReference({photo,region,onOpen}:{photo?:Evidence;region?:Assertion['region']|null;onOpen?:()=>void}){
 const r=region&&[region.x,region.y,region.width,region.height].every(Number.isFinite)&&region.x>=0&&region.y>=0&&region.width>0&&region.height>0&&region.x+region.width<=1&&region.y+region.height<=1?region:null;
 const content=<><span className="photo-reference-image">{photo?<svg viewBox={r?`${r.x*1000} ${r.y*1000} ${r.width*1000} ${r.height*1000}`:'0 0 1000 1000'} role="img" aria-label="원사진 영역"><image href={photo.url} width="1000" height="1000" preserveAspectRatio="none"/></svg>:null}</span><span>사진 참고</span></>;
 return onOpen&&photo?<button type="button" className="photo-reference" onClick={onOpen}>{content}</button>:<span className="photo-reference">{content}</span>;
}
