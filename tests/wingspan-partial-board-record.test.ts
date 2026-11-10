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

test("Wingspan confirmed private habitat and public setup slots save and reopen (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "wingspan",
    "fieldKey": "habitats.scene",
    "componentId": "birds",
    "slotCount": 75,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-assets",
    "areaId": "habitats",
    "areaSlots": {
      "seat-1-habitat-cards": 15,
      "seat-1-attachments": 0,
      "seat-1-available-cubes": 0,
      "seat-2-habitat-cards": 15,
      "seat-2-attachments": 0,
      "seat-2-available-cubes": 0,
      "seat-3-habitat-cards": 15,
      "seat-3-attachments": 0,
      "seat-3-available-cubes": 0,
      "seat-4-habitat-cards": 15,
      "seat-4-attachments": 0,
      "seat-4-available-cubes": 0,
      "seat-5-habitat-cards": 15,
      "seat-5-attachments": 0,
      "seat-5-available-cubes": 0
    }
  },
  {
    "gameId": "wingspan",
    "fieldKey": "shared.scene",
    "componentId": "birds",
    "slotCount": 8,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-assets",
    "areaId": "shared",
    "areaSlots": {
      "bird-tray": 3,
      "birdfeeder": 5,
      "outside-food-dice": 0
    }
  },
  {
    "gameId": "wingspan",
    "fieldKey": "shared.scene",
    "componentId": "food",
    "slotCount": 8,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-assets",
    "areaId": "shared",
    "areaSlots": {
      "bird-tray": 3,
      "birdfeeder": 5,
      "outside-food-dice": 0
    }
  }
]);});
