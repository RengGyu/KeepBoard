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



test("source-confirmed board and market positions preserve each game field and player-count visibility (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "five-tribes",
    "fieldKey": "board.scene",
    "componentId": "tiles",
    "slotCount": 30,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "board",
    "areaSlots": {
      "sultanate": 30,
      "tribes-on-map": 0
    }
  },
  {
    "gameId": "five-tribes",
    "fieldKey": "market.scene",
    "componentId": "cards",
    "slotCount": 12,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "market",
    "areaSlots": {
      "resources-market": 9,
      "djinn-market": 3
    }
  },
  {
    "gameId": "king-of-tokyo",
    "fieldKey": "tokyo.scene",
    "componentId": "monsters",
    "players": 4,
    "slotCount": 1,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "tokyo",
    "areaSlots": {
      "tokyo-city": 1
    }
  },
  {
    "gameId": "king-of-tokyo",
    "fieldKey": "roll.scene",
    "componentId": "dice",
    "players": 4,
    "slotCount": 8,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "roll",
    "areaSlots": {
      "dice-roll": 8
    }
  },
  {
    "gameId": "stone-age",
    "fieldKey": "market.scene",
    "componentId": "cards",
    "slotCount": 8,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "market",
    "areaSlots": {
      "building-market-1": 1,
      "civilization-market-4": 1,
      "building-market-2": 1,
      "civilization-market-3": 1,
      "building-market-3": 1,
      "civilization-market-2": 1,
      "building-market-4": 1,
      "civilization-market-1": 1
    }
  },
  {
    "gameId": "monopoly",
    "fieldKey": "track.scene",
    "componentId": "tokens",
    "slotCount": 40,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "track",
    "areaSlots": {
      "whole-track": 40
    }
  },
  {
    "gameId": "aeons-end",
    "fieldKey": "mages.scene",
    "componentId": "mages",
    "slotCount": 16,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "mages",
    "areaSlots": {
      "breaches-1": 4,
      "mage-1": 0,
      "breaches-2": 4,
      "mage-2": 0,
      "breaches-3": 4,
      "mage-3": 0,
      "breaches-4": 4,
      "mage-4": 0
    }
  },
  {
    "gameId": "aeons-end",
    "fieldKey": "market.scene",
    "componentId": "player-cards",
    "slotCount": 9,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "market",
    "areaSlots": {
      "gems": 3,
      "relics": 2,
      "spells": 4
    }
  }
]);});
