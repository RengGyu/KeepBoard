import type {Condition,FieldDefinition,GamePack,Player,Value} from './types.ts';
import {recognitionCapability} from './recognition';
import {releaseTierFor,type ReleaseTier} from './releaseSupport';

export const RUNTIME_ADAPTER_VERSION='essentials-2';
export type SourceVisibility='public'|'owner'|'hidden'|'own-hidden'|'role-limited';
export interface RuntimeFieldBinding {
 sourceId:string;key:string;label:string;scope:string;visibility:SourceVisibility;
 lifetime:string;editor:'scalar'|'component-catalog'|'opaque-preserve'|'native'|'physical-only';
 componentIds:string[];areaIds:string[];optionSource?:'players'|'roles';
}
export interface GameRuntimeMetadata {
 adapterVersion:string;source:{gameId:string;schemaVersion:string;editionId:string;editionName:string;sha256:string};
 support:{recording:'generic'|'native';illustration:'catalog'|'native';recognition:'manual'|'native'|'assisted';rules:'none'|'native-partial'};
 privatePolicy:'optional-pin'|'pin-before-content';fieldBindings:RuntimeFieldBinding[];
 components:{id:string;name:string;kind:string;variants:{id:string;name:string}[]}[];
 roles:{id:string;name:string}[];
 rules:{id:string;label:string;summary:string;kind:string}[];
 resume:{requiredFieldIds:string[];mustAskFieldIds:string[];pendingActionFields:string[];notes:string[]};
 gaps:string[];
}
export interface GameCatalogEntry {restorationPolicy?:import('./restoration').RestorationPolicy;releaseTier?:ReleaseTier;id:string;title:string;edition:string;version:string;support?:GameRuntimeMetadata['support'];limitations:string[]}
// Current app policy is optional even when a pinned historical pack records an older policy.
export const strictPrivate=(_pack:GamePack):boolean=>false;
export function runtimeBinding(pack:GamePack,key:string){return pack.runtime?.fieldBindings.find(b=>b.key===key);}
export function physicalOnlyField(pack:GamePack,key:string){const b=runtimeBinding(pack,key);return !!b&&(b.editor==='physical-only'||!(b.visibility==='public'&&['public','player'].includes(b.scope)||b.visibility==='owner'&&b.scope==='player'));}
export function effectiveProtectedOwners(_pack:GamePack,_players:readonly Player[],configured:ReadonlySet<string>){return new Set(configured);}
export function hasPrivateDigitalFields(pack:GamePack){return pack.fields.some(f=>f.scope==='player'&&f.visibility!=='public'&&runtimeBinding(pack,f.key)?.editor!=='physical-only');}
export function catalogSummary(pack:GamePack):GameCatalogEntry{return {id:pack.id,title:pack.title,edition:pack.edition,version:pack.version,releaseTier:releaseTierFor(pack),...(pack.restorationPolicy?{restorationPolicy:pack.restorationPolicy}:{}),support:pack.runtime?{...pack.runtime.support,recognition:recognitionCapability(pack).mode}:undefined,limitations:pack.supportGaps};}

// Source data is schema-validated by the generator before this single conversion entry point.
export function adaptSpecification(spec:Record<string,any>,digest:string,native?:GamePack):GamePack {
 const pack:GamePack=native?structuredClone(native):{id:spec.game_id,version:'',title:spec.name_ko,edition:spec.edition.name,description:'명세에 따라 상태를 수동 기록하고 실물을 보관해 이어갑니다.',sources:[],fields:[],requirements:[],derivedRules:[],preservationTemplates:[],supportGaps:[]};
 const aliases:Record<string,string>=native?{turn:'currentPlayer'}:{};
 const bindings:RuntimeFieldBinding[]=[],blocked=new Set<string>();
 const key=(id:string)=>aliases[id]??id;
 for(const f of spec.state_fields){
  const safe=f.visibility==='public'&&['public','player'].includes(f.scope)||f.visibility==='owner'&&f.scope==='player';
  const existing=pack.fields.find(field=>field.key===key(f.id));
  const derived=f.acquisition.includes('derived');
  const editor:RuntimeFieldBinding['editor']=!safe?'physical-only':existing?'native':derived||f.type==='json'?'opaque-preserve':f.type==='component-scene'?'component-catalog':'scalar';
  bindings.push({sourceId:f.id,key:key(f.id),label:f.label,scope:f.scope,visibility:f.visibility,lifetime:f.lifetime,editor,componentIds:[...f.component_ids],areaIds:[...f.area_ids],...(f.option_source?{optionSource:f.option_source}:{})});
  if(!safe){blocked.add(key(f.id));continue;}
  if(existing)continue;
  if(editor==='opaque-preserve'){
   if(!derived){const noteKey=`record-note.${f.id}`;pack.fields.push({key:noteKey,label:`${f.label} · 확인 메모`,description:'구조를 바꾸지 않고 확인한 내용을 글로 남겨요. 원래 상태를 확인했다는 자동 판정은 하지 않아요.',scope:f.scope,visibility:f.visibility,type:'text',lifetime:f.lifetime,acquisition:'ask',group:'essentials',ui:{level:'detail',order:pack.fields.length}});bindings.push({sourceId:`${f.id}:note`,key:noteKey,label:f.label,scope:f.scope,visibility:f.visibility,lifetime:f.lifetime,editor:'scalar',componentIds:[],areaIds:[]});}
   continue;
  }
  const type:FieldDefinition['type']=f.type==='component-scene'?'json':f.option_source||f.type==='enum'?'select':f.type;
  pack.fields.push({key:key(f.id),label:f.label,description:f.description,scope:f.scope,visibility:f.visibility,type,lifetime:f.lifetime,options:type==='select'?structuredClone(f.options??[]):undefined,acquisition:'ask',group:'essentials',ui:{level:'detail',order:pack.fields.length,editor:'default'}});
 }
 const condition=(raw:any):Condition|undefined=>{
  if(!raw)return undefined;
  if(['and','or','not'].includes(raw.op)){const children=(raw.conditions??[]).map(condition);if(children.some((c:unknown)=>!c))throw new Error('지원하지 않는 조건 참조입니다.');return {op:raw.op,conditions:children};}
  if(!pack.fields.some(f=>f.key===key(raw.field_id))||blocked.has(key(raw.field_id)))throw new Error('비밀/미지원 필드 조건은 실행하지 않습니다.');
  return {op:raw.op,field:key(raw.field_id),owner:raw.owner,value:raw.value};
 };
 const gaps=[...spec.gaps];
 const required=[...new Set<string>(spec.resume.required_field_ids)],ask=[...new Set<string>(spec.recognition_correction.must_ask_field_ids)];
 for(const [ids,prefix,priority] of [[required,'resume',90],[ask,'ask',80]] as const){for(const id of ids){const field=pack.fields.find(f=>f.key===key(id)&&!['opaque-preserve','physical-only'].includes(bindings.find(b=>b.key===f.key)?.editor??''));if(field)pack.requirements.push({id:`spec.${prefix}.${id}`,scope:field.scope,fields:[field.key],priority,reason:prefix==='resume'?'이 게임을 이어갈 때 필요한 기록이에요.':'사진으로 알 수 없어 직접 확인하는 항목이에요.'});else gaps.push(`${id}: 내용 입력은 지원하지 않으며 원본과 실물을 보관하세요.`);}}
 for(const rule of spec.rules.filter((r:any)=>!native&&r.kind==='requirement'))try{
  if(!['public','player'].includes(rule.scope))throw new Error('지원하지 않는 비밀 범위입니다.');
  const fields=(rule.required_field_ids??[]).map(key).filter((id:string)=>pack.fields.some(f=>f.key===id)&&!['opaque-preserve','physical-only'].includes(bindings.find(b=>b.key===id)?.editor??''));
  if(fields.length!==(rule.required_field_ids??[]).length)throw new Error('실물/미지원 상태가 필요합니다.');
  if(fields.length)pack.requirements.push({id:`spec.rule.${rule.id}`,scope:rule.scope==='player'?'player':'public',fields,when:condition(rule.when),priority:70,reason:rule.summary});
 }catch{gaps.push(`${rule.name}: 조건 자동 판정 대신 원본 절차를 확인하세요.`);}
 for(const procedure of spec.resume.preserve_procedures){
  const contentPrivate=procedure.visibility==='owner'&&procedure.scope==='player';
  pack.preservationTemplates.push({id:`spec.${procedure.id}`,label:procedure.label,description:procedure.method==='ordered-bundle'?'실물 순서와 앞뒤를 유지해 보관하세요. 내용을 펼쳐 입력할 필요는 없어요.':'실물과 원본을 따로 보관하세요. 비밀 내용은 입력하지 마세요.',scope:procedure.scope==='player'?'player':'public',conditions:[...procedure.steps,...(procedure.order_sensitive?['순서를 섞지 않고 앞뒤 방향을 유지하세요.']:[])],restoreAfter:procedure.after.map((id:string)=>`spec.${id}`),externalOnly:!contentPrivate&&procedure.visibility!=='public',sourceVisibility:procedure.visibility,orderSensitive:procedure.order_sensitive,method:procedure.method});
 }
 // Opaque/unrepresentable states remain available as non-content preservation guidance, never a fake answer.
 for(const b of bindings.filter(b=>b.editor==='opaque-preserve'||b.editor==='physical-only'))if(!spec.resume.preserve_procedures.some((p:any)=>p.field_ids.includes(b.sourceId)))pack.preservationTemplates.push({id:`spec.keep.${b.sourceId}`,label:`${b.label} · 실물 보관`,description:'이 항목은 내용을 입력하지 않고 원본과 실물을 유지하세요.',scope:b.scope==='player'?'player':'public',conditions:['내용을 펼치거나 JSON으로 입력하지 마세요.','기존 순서·방향과 봉인 상태를 유지하세요.'],restoreAfter:[],externalOnly:true,sourceVisibility:b.visibility});
 pack.sources=[...pack.sources,...spec.sources.map((s:any)=>({id:`spec.${s.id}`,title:s.title,url:s.url,section:s.note??''}))];
 pack.runtime={adapterVersion:RUNTIME_ADAPTER_VERSION,source:{gameId:spec.game_id,schemaVersion:spec.schema_version,editionId:spec.edition.id,editionName:spec.edition.name,sha256:digest},support:{recording:native?'native':'generic',illustration:native?'native':'catalog',recognition:native?'native':'manual',rules:native?.id==='catan-base'?'native-partial':'none'},privatePolicy:'optional-pin',fieldBindings:bindings,components:spec.components.map((c:any)=>({id:c.id,name:c.name,kind:c.kind,variants:(c.variants??[]).map((v:any)=>typeof v==='string'?{id:v,name:v}:{id:v.id,name:v.name??v.label??v.id})})),roles:(spec.roles??[]).map((r:any)=>({id:r.id,name:r.name})),rules:spec.rules.map((r:any)=>({id:r.id,label:r.name,summary:r.summary,kind:r.kind})),resume:{requiredFieldIds:required,mustAskFieldIds:ask,pendingActionFields:[...spec.resume.pending_action_fields],notes:[...spec.resume.notes]},gaps};
 pack.version=`${native?.version??'1.0.0'}-${RUNTIME_ADAPTER_VERSION}.${digest.slice(0,12)}`;
 pack.supportGaps=[...new Set([...pack.supportGaps,...gaps,'명세 기반 수동 기록·실물 보존 지원이며 120게임의 자동 인식·전체 규칙 판정을 뜻하지 않습니다.'])];
 return pack;
}
export function bindRuntimePlayers(pack:GamePack,players:Player[]){for(const b of pack.runtime?.fieldBindings??[]){const field=pack.fields.find(f=>f.key===b.key);if(field?.type==='select'&&b.optionSource)field.options=b.optionSource==='players'?players.map(p=>({value:p.id,label:p.name})):(pack.runtime?.roles??[]).map(r=>({value:r.id,label:r.name}));}}
