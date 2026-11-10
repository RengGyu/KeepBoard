import {currentBoardRoundtrip} from './helpers/current-board-record.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { catalogPacks } from '../gamepacks/catalog.ts';
import { validateGenericRecord, type GenericRecord } from '../shared/genericRecord.ts';
import { loadRealAssets } from '../src/realBoards.ts';
import { recordSurfacePoint } from '../src/boardVisuals.ts';

register('../docs/board-story/feedback/skip-css.mjs', import.meta.url);
const { GameBoardRecord } = await import('../src/GameBoardRecord.tsx');

function mount(component: (props: any) => any, props: any) {
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const slots: any[] = []; let cursor = 0; let tree: any; let pending: (() => void)[] = [];
  const dispatcher = {
    useMemo(fn: () => unknown) { cursor++; return fn(); },
    useState(value: any) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], (next: any) => slots[i] = typeof next === 'function' ? next(slots[i]) : next]; },
    useRef(value: any) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(effect: () => any, deps?: any[]) { const i = cursor++, old = slots[i]; if (!old || !deps || deps.some((v, j) => !Object.is(v, old.deps?.[j]))) pending.push(() => { if (typeof old?.cleanup === 'function') old.cleanup(); slots[i] = { deps, cleanup: effect() }; }); }
  };
  const render = () => { cursor = 0; pending = []; const previous = internals.H; internals.H = dispatcher; try { tree = component(props); } finally { internals.H = previous; } for (const effect of pending) effect(); return tree; };
  render(); return { render, get tree() { return tree; }, dispose() { for (const slot of slots) if (typeof slot?.cleanup === 'function') slot.cleanup(); } };
}
function nodes(tree: any): any[] { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
function find(tree: any, predicate: (node: any) => boolean) { const node = nodes(tree).find(predicate); assert(node, 'expected UI element missing'); return node; }

test("Arcs gate/planet targets store map-scene coordinates and restore the selected piece (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "arcs",
    "fieldKey": "map.scene",
    "componentId": "pieces",
    "slotCount": 25,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets-only",
    "areaId": "map",
    "areaSlots": {
      "gate-1": 0,
      "planet-1-1": 0,
      "planet-1-2": 0,
      "planet-1-3": 0,
      "gate-2": 0,
      "planet-2-1": 0,
      "planet-2-2": 0,
      "planet-2-3": 0,
      "gate-3": 0,
      "planet-3-1": 0,
      "planet-3-2": 0,
      "planet-3-3": 0,
      "gate-4": 0,
      "planet-4-1": 0,
      "planet-4-2": 0,
      "planet-4-3": 0,
      "gate-5": 0,
      "planet-5-1": 0,
      "planet-5-2": 0,
      "planet-5-3": 0,
      "gate-6": 0,
      "planet-6-1": 0,
      "planet-6-2": 0,
      "planet-6-3": 0,
      "planet-buildings": 25
    }
  }
]);});
