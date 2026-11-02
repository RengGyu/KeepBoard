import { useEffect, useState } from 'react';

// Drawn boards and piece symbols per game, from public/game-art/real-boards/{gameId}/.
// Complete slot boards and explicitly location-only partial boards may be rendered.

export interface RealSlot { id: string; x: number; y: number; w: number; h: number; capacity?: number; shape?: string; playerCounts?: number[] }
export interface RealArea { id: string; label: string; field: string; scope?: string; accepts?: string[]; ordered?: boolean; slots: RealSlot[]; placement?: string; bounds?: [number, number, number, number] }
export interface RealNetworkCity { id: string; label: string; x: number; y: number; labelX: number; labelY: number }
export interface RealNetworkSegment { index: number; x: number; y: number; polygon: [number, number][] }
export interface RealNetworkRoute { id: number; from: string; to: string; length: number; color: string; colorHex: string; routeType?: 'canal'|'rail'; path: { x1: number; y1: number; x2: number; y2: number }; segments: RealNetworkSegment[] }
export interface RealNetwork { sourceNote?: string; areaId?:string; colorMeaning?:'route-color'|'neutral-diagram'; cities: RealNetworkCity[]; routes: RealNetworkRoute[] }
export interface RealBoardVariant {id:string;svg:string;json:string;exclusive?:boolean}
export interface RealBoardVariantOption {id:string;label:string;value:string|number}
export interface RealBoardVariantSelector {boardField:string;field:string;options:RealBoardVariantOption[]}
export interface RealBoard { gameId: string; status?: string; recordingMode?: 'location-only'|'interactive-network'|'partial-slots'; svg: string; viewBox: [number, number, number, number]; areas: RealArea[]; network?: RealNetwork; playerCount?: Record<string, { hideAreas?: string[] }>; variants?:RealBoardVariant[];variantSelector?:RealBoardVariantSelector;variant?:string }
export interface RealAssets { board: RealBoard; symbols: string[];variants:RealBoardVariant[];variantSelector?:RealBoardVariantSelector;selectedVariant:string }

export function realBoardVariantForValue(selector:RealBoardVariantSelector|undefined,boardField:string,value:unknown){
  if(!selector||selector.boardField!==boardField)return 'base';
  return selector.options.find(option=>Object.is(option.value,value))?.id??'base';
}

export function realSlotAccepts(accepts: string[] | undefined, componentId: string | null | undefined) {
  return !accepts?.length || (!!componentId && accepts.includes(componentId));
}

const cache = new Map<string, Promise<RealAssets | null>>();
const base = (gameId: string) => `/game-art/real-boards/${gameId}`;

export function loadRealAssets(gameId: string,selectedVariant='base'): Promise<RealAssets | null> {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  const key=`${gameId}:${selectedVariant}`;
  if (!cache.has(key)) cache.set(key, (async () => {
    const response = await fetch(`${base(gameId)}/board.json`);
    if (!response.ok) return null;
    const baseBoard = await response.json() as RealBoard;
    const variants=baseBoard.variants??[];
    let board=baseBoard;
    if(selectedVariant!=='base'){
      const asset=variants.find(item=>item.id===selectedVariant);
      if(!asset)return null;
      const variantResponse=await fetch(`${base(gameId)}/${asset.json}`);
      if(!variantResponse.ok)return null;
      board=await variantResponse.json() as RealBoard;
      if(board.variant!==selectedVariant)return null;
    }
    board={...board,variantSelector:baseBoard.variantSelector,variants};
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

export function useRealAssets(gameId: string | undefined,selectedVariant='base') {
  const [assets, setAssets] = useState<RealAssets | null>(null);
  useEffect(() => { if (!gameId) {setAssets(null);return;} let alive = true;setAssets(null);void loadRealAssets(gameId,selectedVariant).then(next => { if (alive) setAssets(next); }); return () => { alive = false; }; }, [gameId,selectedVariant]);
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
  if (board.status !== 'complete') return [];
  const [vx, vy, vw, vh] = board.viewBox;
  return realAreasFor(board, field, players).filter(area => {
    const b = area.bounds;
    return area.slots.length === 0 && b?.length === 4 && b.every(Number.isFinite)
      && b[2] > 0 && b[3] > 0 && b[0] >= vx && b[1] >= vy
      && b[0] + b[2] <= vx + vw && b[1] + b[3] <= vy + vh;
  });
}

export const realBoardSvg = (board: RealBoard) => `${base(board.gameId)}/${board.svg}`;
export const pieceSymbolHref = (gameId: string, symbol: string) => `${base(gameId)}/pieces.svg#${symbol}`;
/** The first drawn symbol for a component (symbols are named piece-{componentId}-{shape}). */
export const pieceSymbolFor = (symbols: string[], componentId: string) => symbols.find(id => id.startsWith(`piece-${componentId}-`));
