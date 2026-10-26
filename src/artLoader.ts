import {assetURL,svgFragment,type ArtMapping,type ArtAsset} from './artResolver';
const mappings=new Map<string,Promise<ArtMapping>>(),fragments=new Map<string,Promise<string>>();
let assets:Promise<Map<string,ArtAsset>>|undefined;
async function json<T>(url:string):Promise<T>{const response=await fetch(url);if(!response.ok)throw new Error('구성물 그림을 불러오지 못했어요.');return response.json();}
export function loadArtMapping(id:string){
 if(!/^[a-z0-9-]+$/.test(id))return Promise.reject(new Error('게임을 확인하세요.'));
 let value=mappings.get(id);if(!value){value=json<ArtMapping>(`/game-art/games/${id}/mapping.json`).catch(error=>{mappings.delete(id);throw error;});mappings.set(id,value);}return value;
}
export function loadArtAssets(){return assets??=json<{assets:ArtAsset[]}>('/game-art/assets.json').then(data=>new Map(data.assets.map(a=>[a.asset_id,a]))).catch(error=>{assets=undefined;throw error;});}
export function loadArtFragment(asset:ArtAsset){
 const url=assetURL(asset);let value=fragments.get(url);
 if(!value){value=fetch(url).then(async response=>{if(!response.ok)throw new Error('구성물 이미지가 없어요.');return svgFragment(await response.text());}).catch(error=>{fragments.delete(url);throw error;});fragments.set(url,value);}return value;
}
