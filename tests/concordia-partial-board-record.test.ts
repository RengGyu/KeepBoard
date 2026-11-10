import {currentBoardRoundtrip} from './helpers/current-board-record.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { catalogPacks } from '../gamepacks/catalog.ts';
import { validateGenericRecord, type GenericRecord } from '../shared/genericRecord.ts';
import { loadRealAssets } from '../src/realBoards.ts';

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

test("Concordia confirmed public market and personal store slots persist on their runtime fields (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "concordia",
    "fieldKey": "display.scene",
    "componentId": "cards",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-table-two-real-maps",
    "areaId": "display",
    "areaSlots": {}
  },
  {
    "gameId": "concordia",
    "fieldKey": "store.scene",
    "componentId": "goods",
    "slotCount": 60,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-two-real-maps",
    "areaId": "store",
    "areaSlots": {
      "seat-1-store": 12,
      "seat-1-cash": 0,
      "seat-2-store": 12,
      "seat-2-cash": 0,
      "seat-3-store": 12,
      "seat-3-cash": 0,
      "seat-4-store": 12,
      "seat-4-cash": 0,
      "seat-5-store": 12,
      "seat-5-cash": 0
    }
  }
]);});
