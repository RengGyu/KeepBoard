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
  const slots: any[] = [];
  let cursor = 0;
  let tree: any;
  let pending: (() => void)[] = [];
  const dispatcher = {
    useMemo(fn: () => unknown) { cursor++; return fn(); },
    useState(value: any) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], (next: any) => slots[i] = typeof next === 'function' ? next(slots[i]) : next];
    },
    useRef(value: any) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(effect: () => any, deps?: any[]) {
      const i = cursor++, old = slots[i];
      if (!old || !deps || deps.some((v, j) => !Object.is(v, old.deps?.[j]))) pending.push(() => {
        if (typeof old?.cleanup === 'function') old.cleanup();
        slots[i] = { deps, cleanup: effect() };
      });
    }
  };
  const render = () => {
    cursor = 0; pending = [];
    const previous = internals.H; internals.H = dispatcher;
    try { tree = component(props); } finally { internals.H = previous; }
    for (const effect of pending) effect();
    return tree;
  };
  render();
  return { render, get tree() { return tree; }, dispose() { for (const slot of slots) if (typeof slot?.cleanup === 'function') slot.cleanup(); } };
}

function nodes(tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

function find(tree: any, predicate: (node: any) => boolean) {
  const node = nodes(tree).find(predicate);
  assert(node, 'expected UI element missing');
  return node;
}

test("Clue location-only board renders its pinned partial map and saves figure coordinates on the existing scene field (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "clue",
    "fieldKey": "mansion.scene",
    "componentId": "figures",
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "whole-table-assets-confirmed-F6420-passages",
    "areaId": "mansion",
    "areaSlots": {
      "mansion": 0
    }
  }
]);});

test('partial boards without an explicit location-only capability stay hidden from the real-board consumer', async () => {
  const originalFetch = globalThis.fetch;
  const board = { gameId: 'partial-test', status: 'partial', svg: 'board.svg', viewBox: [0, 0, 1000, 1000], areas: [] };
  globalThis.fetch = (async () => new Response(JSON.stringify(board), { status: 200 })) as typeof fetch;
  try { assert.equal(await loadRealAssets('partial-test'), null); }
  finally { globalThis.fetch = originalFetch; }
});
