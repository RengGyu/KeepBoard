export interface ArtLayer {asset_id:string;transform?:string}
export interface ArtAdapter {module:string;export:string;props:Record<string,string|number>}
export interface ArtVariant {name:string;layers:ArtLayer[];color?:string;semantic_color?:string;adapter?:ArtAdapter}
export interface ArtComponent {component_id:string;name:string;kind:string;status:string;owner_color_supported:boolean;color_role:string;variants:ArtVariant[];hidden_layers?:ArtLayer[]}
export interface ArtMapping {game_id:string;name_ko:string;name_en:string;components:ArtComponent[]}
export interface ArtAsset {asset_id:string;file:string;owner_color_supported:boolean;classification:string}
export interface ArtRequest {componentId?:string;kind?:string;variant?:string|null;face?:'front'|'back'|'unknown'|null;color?:string}
export interface ArtResolution {unknown:boolean;layers:ArtLayer[];component?:ArtComponent;adapter?:ArtAdapter;variant?:ArtVariant;color?:string}
export const artGameId=(id?:string)=>id==='catan-base'?'catan':id;
export function assetURL(asset:ArtAsset){
 const file=asset.file.replace(/^public\//,'');
 if(!/^[a-zA-Z0-9/_.,-]+\.svg$/.test(file)||file.split('/').includes('..'))throw new Error('구성물 이미지 경로를 확인하세요.');
 return asset.classification==='existing'?`/${file}`:`/game-art/${file}`;
}
export function resolveArt(mapping:ArtMapping,input:ArtRequest):ArtResolution{
 const matches=mapping.components.filter(c=>input.componentId?c.component_id===input.componentId:c.kind===input.kind);
 const component=matches.length===1?matches[0]:undefined;
 const unknown={unknown:true as const,layers:[{asset_id:'common.unknown'}],component};
 if(!component||component.status==='unclear'||input.face==='unknown')return unknown;
 if(input.face==='back')return component.hidden_layers?.length?{unknown:false,layers:component.hidden_layers,component}:unknown;
 let variant=component.variants.find(v=>v.name===input.variant);
 if(!variant&&input.variant)variant=component.variants.find(v=>v.adapter?.props.variant===input.variant);
 if(!variant&&!input.variant&&(component.variants.length===1||component.variants.some(v=>v.name==='default')))variant=component.variants.find(v=>v.name==='default')??component.variants[0];
 if(!variant)return unknown;
 const color=component.owner_color_supported&&component.color_role==='owner'?input.color:variant.color;
 return {unknown:false,layers:variant.layers,adapter:variant.adapter,component,variant,color};
}
// Trusted local library only; reject active/external SVG content before inline composition.
export function svgFragment(source:string){
 if(/<\s*(?:script|foreignObject|iframe|style)\b|\bon\w+\s*=|(?:href|xlink:href)\s*=\s*["'](?!#)|<!DOCTYPE|<!ENTITY/i.test(source))throw new Error('구성물 이미지 형식을 확인하세요.');
 const match=source.trim().match(/^<svg\b[^>]*>([\s\S]*)<\/svg>$/i);
 if(!match)throw new Error('SVG 이미지를 읽지 못했어요.');
 return match[1].replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'');
}
export function namespaceSVG(fragment:string,prefix:string){
 return fragment.replace(/\bid="([^"]+)"/g,(_,id)=>`id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}${id})`).replace(/((?:xlink:)?href)="#([^"]+)"/g,(_,attr,id)=>`${attr}="#${prefix}${id}"`);
}
