import {useEffect,useState} from 'react';
import type {PhotoDefinition} from '../shared/lightweightRecognition';
import type {GamePack} from '../shared/types';

type Source={default:{games:unknown[]}};
const matches=(d:PhotoDefinition,pack:GamePack)=>d.packId===pack.id&&d.packVersion===pack.version&&d.gameId===pack.runtime?.source.gameId&&d.editionId===pack.runtime?.source.editionId&&d.sourceSHA===pack.runtime?.source.sha256;
/** Independent promises ensure a current board never downloads the historical catalog.
 * Rejected loads are retryable, and exact version/SHA lookup remains mandatory. */
export function createPhotoDefinitionLoader(current:()=>Promise<Source>,retired:()=>Promise<Source>){
 let currentRows:PhotoDefinition[]|undefined,retiredRows:PhotoDefinition[]|undefined;
 let currentPending:Promise<void>|undefined,retiredPending:Promise<void>|undefined;
 const find=(pack:GamePack)=>currentRows?.find(d=>matches(d,pack))??retiredRows?.find(d=>matches(d,pack));
 const load=async(pack?:GamePack)=>{
  await (currentPending??=current().then(m=>{currentRows=m.default.games as PhotoDefinition[];}).catch(e=>{currentPending=undefined;throw e;}));
  if(pack&&!find(pack))await (retiredPending??=retired().then(m=>{retiredRows=m.default.games as PhotoDefinition[];}).catch(e=>{retiredPending=undefined;throw e;}));
 };
 return {load,find};
}
const loader=createPhotoDefinitionLoader(()=>import('../game-photo-definitions/index.json'),()=>import('../docs/gamepack-revision-20261026/history/before-runtime-revision/game-photo-definitions/index.json'));
export const loadPhotoDefinitions=loader.load;
export const photoDefinitionFor=loader.find;
export function usePhotoDefinition(pack:GamePack,enabled:boolean){
 const key=JSON.stringify([pack.id,pack.version,pack.runtime?.source]);
 const [state,setState]=useState<{key:string;error:string;ready:boolean}|null>(null);
 useEffect(()=>{if(!enabled)return;let active=true;setState({key,error:'',ready:false});loadPhotoDefinitions(pack).then(()=>{if(active)setState({key,error:'',ready:true});},()=>{if(active)setState({key,error:'촬영 정의를 준비하지 못했어요. 기존 AI로 돌아가거나 다시 로컬 방식을 선택해 주세요.',ready:true});});return()=>{active=false;};},[key,enabled]);
 const definition=enabled?photoDefinitionFor(pack):undefined,error=enabled&&state?.key===key?state.error:'';
 return {definition,loading:enabled&&!definition&&!error&&!(state?.key===key&&state.ready),error};
}
export function observablePhotoArea(definition:PhotoDefinition,area:PhotoDefinition['areas'][number]){return area.fields.length>0&&area.componentIds.some(id=>definition.components.find(c=>c.id===id)?.properties.length);}
