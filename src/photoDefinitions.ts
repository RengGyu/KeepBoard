import {useEffect,useState} from 'react';
import type {PhotoDefinition} from '../shared/lightweightRecognition';
import type {GamePack} from '../shared/types';
let definitions:PhotoDefinition[]|undefined;
let pending:Promise<void>|undefined;
/** This dynamic import is the only runtime dependency on the 120-game definition data. */
export function loadPhotoDefinitions():Promise<void>{
 return pending??=import('../game-photo-definitions/index.json').then(module=>{definitions=module.default.games as PhotoDefinition[];}).catch(error=>{pending=undefined;throw error;});
}
/** Lookup only; the shared task compiler revalidates pinned scope and allowed literals. */
export function photoDefinitionFor(pack:GamePack):PhotoDefinition|undefined {
 const source=pack.runtime?.source;
 return definitions?.find(d=>d.packId===pack.id&&d.packVersion===pack.version&&d.gameId===source?.gameId&&d.editionId===source?.editionId&&d.sourceSHA===source?.sha256);
}
export function usePhotoDefinition(pack:GamePack,enabled:boolean){
 const key=JSON.stringify([pack.id,pack.version,pack.runtime?.source]);
 const [state,setState]=useState<{key:string;error:string}|null>(null);
 useEffect(()=>{if(!enabled)return;let active=true;setState({key,error:''});loadPhotoDefinitions().then(()=>{if(active)setState({key,error:''});},()=>{if(active)setState({key,error:'촬영 정의를 준비하지 못했어요. 기존 AI로 돌아가거나 다시 로컬 방식을 선택해 주세요.'});});return()=>{active=false;};},[key,enabled]);
 const definition=enabled?photoDefinitionFor(pack):undefined,error=enabled&&state?.key===key?state.error:'';
 return {definition,loading:enabled&&!definitions&&!error,error};
}
export function observablePhotoArea(definition:PhotoDefinition,area:PhotoDefinition['areas'][number]){return area.fields.length>0&&area.componentIds.some(id=>definition.components.find(c=>c.id===id)?.properties.length);}
