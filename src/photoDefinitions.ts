import {useEffect,useState} from 'react';
import type {PhotoDefinition} from '../shared/lightweightRecognition';
import type {GamePack} from '../shared/types';

export {createPhotoDefinitionLoader} from './photoDefinitionLoader';
export {loadPhotoDefinitions,photoDefinitionFor} from './photoDefinitionSource';
import {loadPhotoDefinitions,photoDefinitionFor} from './photoDefinitionSource';
export function usePhotoDefinition(pack:GamePack,enabled:boolean){
 const key=JSON.stringify([pack.id,pack.version,pack.runtime?.source]);
 const [state,setState]=useState<{key:string;error:string;ready:boolean}|null>(null);
 useEffect(()=>{if(!enabled)return;let active=true;setState({key,error:'',ready:false});loadPhotoDefinitions(pack).then(()=>{if(active)setState({key,error:'',ready:true});},()=>{if(active)setState({key,error:'촬영 정의를 준비하지 못했어요. 기존 AI로 돌아가거나 다시 로컬 방식을 선택해 주세요.',ready:true});});return()=>{active=false;};},[key,enabled]);
 const definition=enabled?photoDefinitionFor(pack):undefined,error=enabled&&state?.key===key?state.error:'';
 return {definition,loading:enabled&&!definition&&!error&&!(state?.key===key&&state.ready),error};
}
export function observablePhotoArea(definition:PhotoDefinition,area:PhotoDefinition['areas'][number]){return area.fields.length>0&&area.componentIds.some(id=>definition.components.find(c=>c.id===id)?.properties.length);}
