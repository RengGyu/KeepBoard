import type {Assertion,GamePack,Player,Session} from './types.ts';
import type {GenericPiece,GenericPlacement,GenericRecord} from './genericRecord.ts';
import {runtimeBinding,physicalOnlyField} from './gameEssentials.ts';
export interface ComponentLinkOrigin {assertionId:string;pieceId:string;field:string;ownerId?:string;previousPlacement?:GenericPlacement}
export interface ComponentLinkTarget {field:string;label:string;ownerId?:string;ownerName?:string;visibility:'public'|'owner';targetAssertionId?:string|null}
export interface ComponentLinkRequest {sourceAssertionId:string;pieceIds:string[];target:{field:string;ownerId?:string};expectedTargetAssertionId:string|null;corrections?:GenericPiece[];clearPlacement?:boolean;expectedRevisions?:Record<string,number>}
export interface ComponentLinkOptions {sourceAssertionId:string;pieces:GenericPiece[];targets:ComponentLinkTarget[];targetVersions:Record<string,string|null>}
export const componentTargetKey=(field:string,ownerId?:string)=>JSON.stringify([field,ownerId??null]);
export const componentRecord=(a:Assertion|undefined):GenericRecord|undefined=>{const v=a?.value as unknown as GenericRecord;return v?.version==='game-component-record-v1'&&Array.isArray(v.pieces)?v:undefined;};
export const latestComponentAssertion=(s:Pick<Session,'assertions'>,field:string,ownerId?:string)=>s.assertions.filter(a=>a.field===field&&a.ownerId===ownerId&&a.status==='accepted').at(-1);
export function linkedComponents(session:Pick<Session,'assertions'>){return session.assertions.filter(a=>a.status==='accepted').flatMap(a=>(componentRecord(a)?.pieces??[]).filter(p=>!!p.linkOrigin).map(piece=>({assertion:a,piece,origin:piece.linkOrigin!})));}
export function unlinkedComponentPieces(session:Pick<Session,'assertions'>,source:Assertion){const linked=linkedComponents(session);return (componentRecord(source)?.pieces??[]).filter(p=>source.status==='accepted'||!linked.some(x=>x.origin.assertionId===source.id&&x.origin.pieceId===p.id));}
/** Only existing pack destinations; ownership is explicit at assertion scope, never inferred from a crop. */
export function componentLinkTargets(pack:GamePack,players:Player[],pieces:GenericPiece[]):ComponentLinkTarget[]{
 if(!pieces.length||pack.runtime?.support.recording==='native')return [];
 return pack.fields.flatMap(f=>{const b=runtimeBinding(pack,f.key);if(b?.editor!=='component-catalog'||physicalOnlyField(pack,f.key)||!['public','player'].includes(f.scope)||!['public','owner'].includes(f.visibility??'public')||pieces.some(p=>p.componentId!==null&&!b.componentIds.includes(p.componentId)))return [];
 const target={field:f.key,label:f.label,visibility:(f.visibility??'public') as 'public'|'owner'};return f.scope==='player'?players.map(p=>({...target,ownerId:p.id,ownerName:p.name})):[target];});
}
