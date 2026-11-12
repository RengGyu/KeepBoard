import {Component,lazy,Suspense,type ComponentType,type ReactNode} from 'react';
import {Busy} from './ui';
class ScreenError extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<p role="alert">화면을 불러오지 못했어요. 기록은 그대로예요. 새로고침 후 다시 열어 주세요.</p>:this.props.children;}
}
function screen<T extends ComponentType<any>>(load:()=>Promise<{default:T}>):T{
 const View=lazy(load);
 return ((props:any)=><ScreenError><Suspense fallback={<Busy/>}><View {...props}/></Suspense></ScreenError>) as T;
}
export const SceneWorkspace=screen(()=>import('./SceneWorkspace').then(m=>({default:m.SceneWorkspace})));
export const RummikubWorkspace=screen(()=>import('./RummikubWorkspace').then(m=>({default:m.RummikubWorkspace})));
export const RummikubBoardView=screen(()=>import('./RummikubBoard').then(m=>({default:m.RummikubBoardView})));
export const CatanOverview=screen(()=>import('./CatanOverview').then(m=>({default:m.CatanOverview})));
export const CatanPhotoFrame=screen(()=>import('./CatanPhotoFrame').then(m=>({default:m.CatanPhotoFrame})));
