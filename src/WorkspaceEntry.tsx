import {lazy,Suspense,useEffect,useState,type ComponentProps,type ReactNode} from 'react';
import type {GamePack} from '../shared/types';
import {gameDataFor,loadGameData} from './gameData';
import {gameDataKey} from '../shared/readouts/identity';
import {Busy} from './ui';
const Workspace=lazy(()=>import('./SessionWorkspace'));
/** Never mount an editor against an empty/wrong-version catalog. Late loads only fill their own cache key. */
export function GameDataBoundary({pack,children,ready=gameDataFor,load=loadGameData}:{pack:GamePack;children:ReactNode;ready?:(p:GamePack)=>unknown;load?:(p:GamePack)=>Promise<void>}){
 const key=gameDataKey(pack),[state,setState]=useState<{key:string;error:string;ready:boolean}|null>(null),[retry,setRetry]=useState(0),needed=!!pack.runtime?.source,available=!needed||!!ready(pack);
 useEffect(()=>{if(available)return;let active=true;setState({key,error:'',ready:false});load(pack).then(()=>{if(active)setState({key,error:'',ready:true});},()=>{if(active)setState({key,error:'게임 편집 데이터를 불러오지 못했어요. 기존 기록은 그대로예요.',ready:false});});return()=>{active=false;};},[key,retry,available]);
 if(!available&&!(state?.key===key&&state.ready))return state?.key===key&&state.error?<div role="alert"><p>{state.error}</p><button type="button" className="button secondary" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</button></div>:<Busy/>;
 return <>{children}</>;
}
export default function WorkspaceEntry(props:ComponentProps<typeof import('./SessionWorkspace').default>){return <GameDataBoundary pack={props.view.pack}><Suspense fallback={<Busy/>}><Workspace {...props}/></Suspense></GameDataBoundary>;}
