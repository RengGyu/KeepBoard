import type {GamePack} from './types.ts';
/** Additive app capability for the verified base edition; raw/pinned pack identity and answers stay unchanged. */
export function effectiveComponentStatePack(raw:GamePack):GamePack{
 if(raw.runtime?.source.gameId!=='splendor'||raw.runtime.source.editionId!=='base'||!raw.runtime.components.some(c=>c.id==='chips')||raw.fields.some(f=>f.key==='supply.scene'))return raw;
 const p=structuredClone(raw),key='supply.scene';
 p.fields.push({key,label:'공용 보석·금 공급',description:'아직 누구도 가져가지 않은 공용 토큰입니다. 플레이어 보유 토큰과 구분해 연결하세요.',type:'json',scope:'public',visibility:'public',lifetime:'session',acquisition:'ask',group:'essentials'});
 p.runtime!.fieldBindings.push({key,sourceId:'app.splendor.supply-v1',label:'공용 보석·금 공급',editor:'component-catalog',scope:'public',visibility:'public',lifetime:'session',areaIds:['supply'],componentIds:['chips']});
 if(!p.sources.some(s=>s.id==='app.splendor.supply-v1'))p.sources.push({id:'app.splendor.supply-v1',title:'Splendor base rules — setup and gem tokens',url:'https://cdn.svc.asmodee.net/production-unboxnowcom/uploads/2022/02/Splendor-EN.pdf',section:'Game setup: gem tokens in piles within reach; Buying a development card: spent tokens returned to the middle; The bonuses: purchased-card bonuses. Additive manual-link destination, not new photo permission.'});
 return p;
}
