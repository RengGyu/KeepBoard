import { useEffect, useState } from 'react';
import type {Assertion,GamePack} from '../shared/types';
import type {GenericRecord} from '../shared/genericRecord';

// Drawn boards and piece symbols per game, from public/game-art/real-boards/{gameId}/.
// Complete slot boards and explicitly location-only partial boards may be rendered.

export interface RealSlot { id: string; x: number; y: number; w: number; h: number; capacity?: number; shape?: string; label?: string; stack?: boolean; playerCounts?: number[] }
export interface RealArea { id: string; label: string; field: string; scope?: string; accepts?: string[]; ordered?: boolean; slots: RealSlot[]; placement?: string; bounds?: [number, number, number, number] }
export interface RealNetworkCity { id: string; label: string; x: number; y: number; labelX: number; labelY: number }
export interface RealNetworkSegment { index: number; x: number; y: number; polygon: [number, number][] }
export interface RealNetworkRoute { id: number; from: string; to: string; length: number; color: string; colorHex: string; routeType?: 'canal'|'rail'; path: { x1: number; y1: number; x2: number; y2: number }; segments: RealNetworkSegment[] }
export interface RealNetwork { sourceNote?: string; areaId?:string; colorMeaning?:'route-color'|'neutral-diagram'; cities: RealNetworkCity[]; routes: RealNetworkRoute[] }
export interface RealBoardVariant {id:string;svg:string;json:string;exclusive?:boolean;label?:string;placementFrame?:string;fields?:string[]}
export interface RealBoardVariantOption {id:string;label:string;value:string|number}
export interface RealBoardVariantSelector {boardField:string;field:string;options:RealBoardVariantOption[]}
export interface RealBoardLayerView {field:string;property:string;componentIds:string[];label?:string}
export interface RealBoard {assetSHA?:string; gameId: string; status?: string; recordingMode?: 'location-only'|'interactive-network'|'partial-slots'; svg: string; viewBox: [number, number, number, number]; areas: RealArea[]; network?: RealNetwork; playerCount?: Record<string, { hideAreas?: string[] }>; variants?:RealBoardVariant[];variantSelector?:RealBoardVariantSelector;manualVariantsFor?:string|string[];manualVariantLabel?:string;manualVariantLabels?:Record<string,string>;manualVariantBaseLabel?:string;layerView?:RealBoardLayerView;variant?:string;placementFrame?:string;supportedPlayerCounts?:number[];supportedPlayerCountsByField?:Record<string,number[]> }
export interface RealAssets { board: RealBoard; symbols: string[];variants:RealBoardVariant[];variantSelector?:RealBoardVariantSelector;selectedVariant:string }

export function realBoardVariantForValue(selector:RealBoardVariantSelector|undefined,boardField:string,value:unknown){
  if(!selector||selector.boardField!==boardField)return 'base';
  return selector.options.find(option=>Object.is(option.value,value))?.id??'base';
}

export function realSlotAccepts(accepts: string[] | undefined, componentId: string | null | undefined) {
  return !accepts?.length || (!!componentId && accepts.includes(componentId));
}

// Existing placements use the generic surface's inset coordinates. Version the
// free SVG frame inside the already-preserved layout identity; never reinterpret
// untagged saved positions as exact SVG positions.
const FREE_FRAME='free-board-v1:';
export const realFreeLayoutVariant=(variant='base')=>FREE_FRAME+variant;
export const realSlotLayoutVariant=(frame:string)=>'slot-board-v1:'+frame;
export const isRealFreePlacement=(variant:string|undefined)=>!!variant?.startsWith(FREE_FRAME);
export const realPlacementVariant=(variant:string|undefined)=>isRealFreePlacement(variant)?variant!.slice(FREE_FRAME.length):variant??'base';

/** A view may be specific to one record field; older assets keep all their views. */
export const realBoardVariantsFor=(board:RealBoard|undefined,field:string)=>(board?.variants??[]).filter(v=>!v.fields||v.fields.includes(field));

export const realManualVariantsFor=(board:RealBoard|undefined,field:string)=>!board?.variantSelector&&(Array.isArray(board?.manualVariantsFor)?board.manualVariantsFor.includes(field):board?.manualVariantsFor===field);

/** Restore a view from explicit saved coordinate identities, never from mission text,
 * object values or untagged legacy positions. Mixed or shared frames stay at base. */
export function realBoardViewForPlacements(board:RealBoard|undefined,field:string,placements:readonly({layoutVariant?:string}|undefined)[]){
  if(!board||!realManualVariantsFor(board,field))return 'base';
  const views=[{id:'base',placementFrame:board.placementFrame},...realBoardVariantsFor(board,field)],found=new Set<string>();
  for(const placement of placements){
    const tag=placement?.layoutVariant;
    if(!tag)continue;
    const matches=views.filter(v=>v.placementFrame&&(tag===realSlotLayoutVariant(v.placementFrame)||tag===realFreeLayoutVariant(v.placementFrame)));
    // Identical geometry can support several physical subsets; coordinates do not
    // establish which subset or scenario phase is currently present.
    if(matches.length>1)return 'base';
    if(matches.length===1)found.add(matches[0].id);
  }
  return found.size===1?[...found][0]:'base';
}

const cache = new Map<string, Promise<RealAssets | null>>();
const base = (gameId: string) => `/game-art/real-boards/${gameId}`;

export function loadRealAssets(gameId: string,selectedVariant='base',verifySpatialAsset=false): Promise<RealAssets | null> {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  const key=`${gameId}:${selectedVariant}:${verifySpatialAsset}`;
  if (!cache.has(key)) cache.set(key, (async () => {
    const response = await fetch(`${base(gameId)}/board.json`);
    if (!response.ok) return null;
    const assetHash=async(r:Response)=>{try{if(!r.clone||!globalThis.crypto?.subtle)return undefined;const bytes=await r.clone().arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}catch{return undefined;}};
    const baseHash=verifySpatialAsset?await assetHash(response):undefined;
    const baseBoard = {...await response.json(),...(baseHash?{assetSHA:baseHash}:{})} as RealBoard;
    const variants=baseBoard.variants??[];
    let board=baseBoard;
    if(selectedVariant!=='base'){
      const asset=variants.find(item=>item.id===selectedVariant);
      if(!asset)return null;
      const variantResponse=await fetch(`${base(gameId)}/${asset.json}`);
      if(!variantResponse.ok)return null;
      const variantHash=verifySpatialAsset?await assetHash(variantResponse):undefined;
      board={...await variantResponse.json(),...(variantHash?{assetSHA:variantHash}:{})} as RealBoard;
      if(board.variant!==selectedVariant)return null;
    }
    board={...board,variantSelector:baseBoard.variantSelector,manualVariantsFor:baseBoard.manualVariantsFor,manualVariantLabel:baseBoard.manualVariantLabel,manualVariantLabels:baseBoard.manualVariantLabels,manualVariantBaseLabel:baseBoard.manualVariantBaseLabel,variants};
    const locationOnly = board.status === 'partial' && board.recordingMode === 'location-only' && board.areas.some(area => area.placement === 'location-only' && area.slots.length === 0);
    const network = board.network;
    const interactiveNetwork = board.status === 'partial' && board.recordingMode === 'interactive-network' && !!network && board.areas.some(area => area.id === network.areaId);
    const partialSlots = board.status === 'partial' && board.recordingMode === 'partial-slots' && board.areas.some(area => area.slots.length > 0);
    // Partial whole-table drawings with no fixed slots (scenario maps): the drawing becomes the backdrop for free placement.
    const freeTable = board.status === 'partial' && board.areas.length > 0 && board.areas.every(area => area.slots.length === 0);
    if ((board.status !== 'complete' && !locationOnly && !interactiveNetwork && !partialSlots && !freeTable) || !Array.isArray(board.areas) || !Array.isArray(board.viewBox)) return null;
    const pieces = await fetch(`${base(gameId)}/pieces.svg`).then(r => r.ok ? r.text() : '').catch(() => '');
    return { board, symbols: [...pieces.matchAll(/<symbol id="([^"]+)"/g)].map(match => match[1]),variants,variantSelector:baseBoard.variantSelector,selectedVariant };
  })().catch(() => null));
  return cache.get(key)!;
}

export function useRealAssets(gameId: string | undefined,selectedVariant='base',verifySpatialAsset=false) {
  const [assets, setAssets] = useState<RealAssets | null>(null);
  useEffect(() => { if (!gameId) {setAssets(null);return;} let alive = true;setAssets(null);void loadRealAssets(gameId,selectedVariant,verifySpatialAsset).then(next => { if (alive) setAssets(next); }); return () => { alive = false; }; }, [gameId,selectedVariant,verifySpatialAsset]);
  return assets;
}

/** Areas of one record field, minus those the board hides for this player count. */
export function realAreasFor(board: RealBoard, field: string, players?: number) {
  const hidden = new Set(players ? board.playerCount?.[String(players)]?.hideAreas ?? [] : []);
  return board.areas.filter(area => area.field === field && !hidden.has(area.id)).map(area => {
    if (!players) return area;
    const slots = area.slots.filter(slot => !slot.playerCounts || slot.playerCounts.includes(players));
    return slots.length === area.slots.length ? area : { ...area, slots };
  });
}

/** Verified, variable-size collections on a complete board, not guessed slots. */
export function realFreeAreasFor(board: RealBoard, field: string, players?: number) {
  const verifiedPartial=board.status==='partial'&&board.recordingMode==='partial-slots';
  if (board.status !== 'complete'&&!verifiedPartial) return [];
  const [vx, vy, vw, vh] = board.viewBox;
  return realAreasFor(board, field, players).filter(area => {
    const b = area.bounds;
    // Cropped location-only maps retain their established inset coordinate frame.
    return (!verifiedPartial||area.placement==='free-pieces') && area.placement !== 'location-only' && area.slots.length === 0 && b?.length === 4 && b.every(Number.isFinite)
      && b[2] > 0 && b[3] > 0 && b[0] >= vx && b[1] >= vy
      && b[0] + b[2] <= vx + vw && b[1] + b[3] <= vy + vh;
  });
}

export const realBoardSvg = (board: RealBoard) => `${base(board.gameId)}/${board.svg}`;
export const pieceSymbolHref = (gameId: string, symbol: string) => `${base(gameId)}/pieces.svg#${symbol}`;
/** The first drawn symbol for a component (symbols are named piece-{componentId}-{shape}). */
export const pieceSymbolFor = (symbols: string[], componentId: string) => symbols.find(id => id.startsWith(`piece-${componentId}-`));

/** Tags name coordinate frames, never asset variants. Reuse the record editor's existing interpretation. */
export function sceneDisplayBoardContext(pack:GamePack,board:RealBoard){return {packId:pack.id,packVersion:pack.version,sourceSHA:pack.runtime?.source.sha256??null,board,manualLayoutTags:[realFreeLayoutVariant(board.placementFrame??board.variant??'base'),realSlotLayoutVariant(board.placementFrame??'base')]};}
/** Exact loaded board variants for display only; async loading never writes a scene or a record. */
export function useSceneBoardAssets(pack:GamePack,assertions:readonly Assertion[]){
 const gameId=pack.runtime?.source.gameId,records=assertions.flatMap(a=>{const r=a.value as unknown as GenericRecord;return r?.version==='game-component-record-v1'?[{field:a.field,pieces:r.pieces}]:[];}),key=JSON.stringify([gameId,pack.id,pack.version,pack.runtime?.source.sha256,records.map(r=>[r.field,r.pieces.map(p=>[p.placement?.layoutVariant,p.spatial?.resolved?.frameId])])]);
 const [loaded,setLoaded]=useState<{key:string;assets:RealAssets[]}>({key:'',assets:[]});
 useEffect(()=>{let alive=true;if(!gameId)return;void (async()=>{const base=await loadRealAssets(gameId,'base',true);if(!base)return [];const variants=new Set(['base']);for(const record of records)for(const piece of record.pieces){if(piece.spatial?.resolved?.frameId)variants.add(piece.spatial.resolved.frameId);const restored=realBoardViewForPlacements(base.board,record.field,[piece.placement]);if(restored!=='base')variants.add(restored);const tag=piece.placement?.layoutVariant;if(tag&&base.variants.some(v=>v.id===tag))variants.add(tag);}return Promise.all([...variants].map(v=>v==='base'?base:loadRealAssets(gameId,v,true)));})().then(results=>{if(alive)setLoaded({key,assets:results.filter((a):a is RealAssets=>!!a)});});return()=>{alive=false;};},[key]);
 return loaded.key===key?loaded.assets:[];
}
