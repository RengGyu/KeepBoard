import {useEffect,useId,useState,type CSSProperties} from 'react';
import {ComponentArt,type ComponentArtProps} from './ComponentArt';
import {CarcassonneArt,type CarcassonneArtProps} from './CarcassonneArt';
import {artGameId,namespaceSVG,resolveArt,type ArtMapping,type ArtRequest} from './artResolver';
import {loadArtAssets,loadArtFragment,loadArtMapping} from './artLoader';
import {SCENE_VARIANTS,type SceneKind} from '../shared/scene';
export interface GameComponentArtProps extends ComponentArtProps {game?:string;componentId?:string;face?:ArtRequest['face'];mapping?:ArtMapping}
export function GameComponentArt(props:GameComponentArtProps){
 const {game,componentId,mapping,face,...native}=props;
 const id=artGameId(game);
 // Current Catan editor stays synchronous and retains its dynamic geometry/numbers.
 if((!id||id==='catan')&&!componentId&&face!=='back'&&face!=='unknown'){
  const needsVariant=['terrain','resource-card','development-card'].includes(native.kind);
  const known=!needsVariant||SCENE_VARIANTS[native.kind as SceneKind]?.some(v=>v.value===native.variant);
  return <ComponentArt {...native} kind={known?native.kind:'unknown'}/>;
 }
 return <MappedArt {...props} game={id}/>;
}
function MappedArt({game,componentId,kind,variant,color,label,number,size=64,className='',face,mapping:provided}:GameComponentArtProps){
 const [mapping,setMapping]=useState<ArtMapping|undefined>(provided),[error,setError]=useState(false);
 useEffect(()=>{let alive=true;setMapping(provided);setError(false);if(!provided&&game)loadArtMapping(game).then(m=>{if(alive)setMapping(m);},()=>{if(alive)setError(true);});return()=>{alive=false;};},[game,provided]);
 const current=provided??(mapping?.game_id===game?mapping:undefined);
 const result=current?resolveArt(current,{componentId,kind,variant,color,face}):null;
 const name=label??result?.component?.name??'구성물';
 if(error||!game||!result||result.unknown)return <ComponentArt kind="unknown" label={error?`${name} · 그림 불러오기 실패`:`${name} · 미확인`} size={size} className={className}/>;
 if(result.adapter?.module==='src/ComponentArt.tsx'&&result.adapter.export==='ComponentArt')return <ComponentArt {...result.adapter.props as unknown as ComponentArtProps} {...(result.color?{color:result.color}:{})} {...(number!==undefined?{number}:{})} size={size} label={name} className={className}/>;
 if(result.adapter?.module==='src/CarcassonneArt.tsx'&&result.adapter.export==='CarcassonneArt')return <CarcassonneArt {...result.adapter.props as unknown as CarcassonneArtProps} {...(result.color?{color:result.color}:{})} size={size} label={name} className={className}/>;
 return <LayerArt layers={result.layers} color={result.color} size={size} label={name} className={className}/>;
}
function LayerArt({layers,color,size,label,className}:{layers:{asset_id:string;transform?:string}[];color?:string;size:number;label:string;className:string}){
 const key=JSON.stringify(layers),[loaded,setLoaded]=useState<{key:string;fragments:string[]}|null>(null),[error,setError]=useState(false);
 const prefix=useId().replace(/[^a-zA-Z0-9_-]/g,'')+'-';
 useEffect(()=>{let alive=true;setError(false);loadArtAssets().then(async index=>Promise.all(layers.map(async layer=>{const asset=index.get(layer.asset_id);if(!asset)throw new Error('구성물 그림을 찾지 못했어요.');return loadArtFragment(asset);}))).then(fragments=>{if(alive)setLoaded({key,fragments});},()=>{if(alive)setError(true);});return()=>{alive=false;};},[key]);
 if(error||loaded?.key!==key)return <ComponentArt kind="unknown" label={`${label} · ${error?'그림 불러오기 실패':'그림 준비 중'}`} size={size} className={className}/>;
 return <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label} className={`game-component-art ${className}`} style={{'--owner':color??'#bc6048'} as CSSProperties}><title>{label}</title>{layers.map((layer,i)=><g key={i} transform={layer.transform} dangerouslySetInnerHTML={{__html:namespaceSVG(loaded.fragments[i],`${prefix}${i}-`)}}/>)}</svg>;
}
