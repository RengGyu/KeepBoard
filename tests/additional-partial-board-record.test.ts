import {currentBoardRoundtrip} from './helpers/current-board-record.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { catalogPacks } from '../gamepacks/catalog.ts';
import { validateGenericRecord, type GenericRecord } from '../shared/genericRecord.ts';
import { loadRealAssets } from '../src/realBoards.ts';
import { realAreasFor } from '../src/realBoards.ts';

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



test("additional confirmed tracks and setup slots persist through the existing record fields (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "space-base",
    "fieldKey": "market.scene",
    "componentId": "ships",
    "slotCount": 18,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "market",
    "areaSlots": {
      "shipyard": 18
    }
  },
  {
    "gameId": "space-base",
    "fieldKey": "tracks.scene",
    "componentId": "markers",
    "slotCount": 123,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "tracks",
    "areaSlots": {
      "track-credits": 41,
      "track-income": 41,
      "track-vp": 41,
      "track-overflow": 0
    }
  },
  {
    "gameId": "space-base",
    "fieldKey": "roll.scene",
    "componentId": "dice",
    "slotCount": 2,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "roll",
    "areaSlots": {
      "roll": 2
    }
  },
  {
    "gameId": "cascadia",
    "fieldKey": "offer.scene",
    "componentId": "habitat",
    "slotCount": 8,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "offer",
    "areaSlots": {
      "offer-habitat": 4,
      "offer-wildlife": 4
    }
  },
  {
    "gameId": "cascadia",
    "fieldKey": "goals.scene",
    "componentId": "scoring",
    "slotCount": 5,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "goals",
    "areaSlots": {
      "scoring-cards": 5
    }
  },
  {
    "gameId": "everdell",
    "fieldKey": "common.scene",
    "componentId": "cards",
    "slotCount": 29,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-base-assets",
    "areaId": "common",
    "areaSlots": {
      "special-events": 4,
      "basic-events": 4,
      "exclusive-basic-worker-spaces": 6,
      "forest-cards": 4,
      "exclusive-journeys": 3,
      "meadow": 8
    }
  },
  {
    "gameId": "everdell",
    "fieldKey": "city.scene",
    "componentId": "cards",
    "slotCount": 60,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-base-assets",
    "areaId": "city",
    "areaSlots": {
      "seat-1-city": 15,
      "seat-1-attachments": 0,
      "seat-1-wanderers": 0,
      "seat-1-stock": 0,
      "seat-1-workers-ready": 0,
      "seat-2-city": 15,
      "seat-2-attachments": 0,
      "seat-2-wanderers": 0,
      "seat-2-stock": 0,
      "seat-2-workers-ready": 0,
      "seat-3-city": 15,
      "seat-3-attachments": 0,
      "seat-3-wanderers": 0,
      "seat-3-stock": 0,
      "seat-3-workers-ready": 0,
      "seat-4-city": 15,
      "seat-4-attachments": 0,
      "seat-4-wanderers": 0,
      "seat-4-stock": 0,
      "seat-4-workers-ready": 0
    }
  },
  {
    "gameId": "barrage",
    "fieldKey": "basin.scene",
    "componentId": "structures",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-alps-network-four-company-wheels-contracts",
    "areaId": "basin",
    "areaSlots": {
      "whole-basin": 0,
      "whole-supply": 0
    }
  },
  {
    "gameId": "barrage",
    "fieldKey": "company.scene",
    "componentId": "structures",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-alps-network-four-company-wheels-contracts",
    "areaId": "company",
    "areaSlots": {
      "usa-company": 0,
      "germany-company": 0,
      "italy-company": 0,
      "france-company": 0
    }
  },
  {
    "gameId": "agricola",
    "fieldKey": "farm-area.scene",
    "componentId": "farm",
    "slotCount": 15,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "farm-area",
    "areaSlots": {
      "farm-tiles": 15
    }
  },
  {
    "gameId": "agricola",
    "fieldKey": "actions.scene",
    "componentId": "cards",
    "slotCount": 50,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "actions",
    "areaSlots": {
      "base-actions": 10,
      "two-player-action-tile": 4,
      "three-four-action-tile": 2,
      "three-player-extension": 4,
      "four-player-extension": 6,
      "stage-1": 4,
      "stage-2": 3,
      "stage-3": 2,
      "stage-4": 2,
      "stage-5": 2,
      "stage-6": 1,
      "major-improvements": 10,
      "general-supply": 0
    }
  },
  {
    "gameId": "ark-nova",
    "fieldKey": "action-row.scene",
    "componentId": "actions",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-four-owner-table-retail-map-overlays-and-tile-footprints",
    "areaId": "action-row",
    "areaSlots": {
      "owner-1-actions": 0,
      "owner-2-actions": 0,
      "owner-3-actions": 0,
      "owner-4-actions": 0
    }
  },
  {
    "gameId": "ark-nova",
    "fieldKey": "shared.scene",
    "componentId": "cards",
    "players": 4,
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-four-owner-table-retail-map-overlays-and-tile-footprints",
    "areaId": "shared",
    "areaSlots": {
      "shared": 0,
      "association": 0
    }
  },
  {
    "gameId": "ark-nova",
    "fieldKey": "shared.scene",
    "componentId": "cards",
    "players": 3,
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-four-owner-table-retail-map-overlays-and-tile-footprints",
    "areaId": "shared",
    "areaSlots": {
      "shared": 0,
      "association": 0
    }
  },
  {
    "gameId": "grand-austria-hotel",
    "fieldKey": "hotel.scene",
    "componentId": "rooms",
    "slotCount": 80,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-all-hotel-faces",
    "areaId": "hotel",
    "areaSlots": {
      "seat-1-rooms": 20,
      "seat-2-rooms": 20,
      "seat-3-rooms": 20,
      "seat-4-rooms": 20
    }
  },
  {
    "gameId": "grand-austria-hotel",
    "fieldKey": "cafe.scene",
    "componentId": "guests",
    "slotCount": 12,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-all-hotel-faces",
    "areaId": "cafe",
    "areaSlots": {
      "seat-1-cafe": 3,
      "seat-1-kitchen": 0,
      "seat-2-cafe": 3,
      "seat-2-kitchen": 0,
      "seat-3-cafe": 3,
      "seat-3-kitchen": 0,
      "seat-4-cafe": 3,
      "seat-4-kitchen": 0
    }
  },
  {
    "gameId": "grand-austria-hotel",
    "fieldKey": "actions.scene",
    "componentId": "dice",
    "slotCount": 11,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-all-hotel-faces",
    "areaId": "actions",
    "areaSlots": {
      "guest-queue": 5,
      "action-face-1": 1,
      "action-face-2": 1,
      "action-face-3": 1,
      "action-face-4": 1,
      "action-face-5": 1,
      "action-face-6": 1
    }
  },
  {
    "gameId": "race-for-the-galaxy",
    "fieldKey": "actions.scene",
    "componentId": "cards",
    "slotCount": 36,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "actions",
    "areaSlots": {
      "actions-player-1": 9,
      "actions-player-2": 9,
      "actions-player-3": 9,
      "actions-player-4": 9
    }
  },
  {
    "gameId": "le-havre",
    "fieldKey": "harbor.scene",
    "componentId": "workers",
    "slotCount": 7,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "harbor",
    "areaSlots": {
      "offer-fish": 0,
      "offer-wood": 0,
      "offer-clay": 0,
      "offer-iron": 0,
      "offer-grain": 0,
      "offer-cattle": 0,
      "seven-supply-turns": 7
    }
  },
  {
    "gameId": "orleans",
    "fieldKey": "tracks.scene",
    "componentId": "followers",
    "slotCount": 45,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "tracks",
    "areaSlots": {
      "deed-city-wall": 10,
      "deed-papal-election": 3,
      "deed-fight-plague": 5,
      "deed-astronomy": 3,
      "deed-boatmen-guild": 4,
      "deed-cathedral": 6,
      "deed-peace-treaty": 4,
      "deed-canalization": 10
    }
  },
  {
    "gameId": "castles-burgundy",
    "fieldKey": "duchy.scene",
    "componentId": "hexes",
    "players": 4,
    "slotCount": 37,
    "input": "slot",
    "status": "partial",
    "recordingMode": "partial-slots",
    "areaId": "duchy",
    "areaSlots": {
      "duchy": 37
    }
  },
  {
    "gameId": "castles-burgundy",
    "fieldKey": "depots.scene",
    "componentId": "hexes",
    "players": 4,
    "slotCount": 32,
    "input": "slot",
    "status": "partial",
    "recordingMode": "partial-slots",
    "areaId": "depots",
    "areaSlots": {
      "depot-1": 4,
      "depot-1-goods": 0,
      "depot-2": 4,
      "depot-2-goods": 0,
      "depot-3": 4,
      "depot-3-goods": 0,
      "depot-4": 4,
      "depot-4-goods": 0,
      "depot-5": 4,
      "depot-5-goods": 0,
      "depot-6": 4,
      "depot-6-goods": 0,
      "black-depot": 8,
      "phase-goods-1": 0,
      "round-goods-1": 0,
      "phase-goods-2": 0,
      "round-goods-2": 0,
      "phase-goods-3": 0,
      "round-goods-3": 0,
      "phase-goods-4": 0,
      "round-goods-4": 0,
      "phase-goods-5": 0,
      "round-goods-5": 0,
      "hex-supply": 0
    }
  },
  {
    "gameId": "castles-mad-ludwig",
    "fieldKey": "market.scene",
    "componentId": "rooms",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-revised-castle-door-graph-market-all-four-player-state",
    "areaId": "market",
    "areaSlots": {
      "whole-market": 0,
      "whole-master-builder": 0
    }
  },
  {
    "gameId": "through-the-ages",
    "fieldKey": "row.scene",
    "componentId": "cards",
    "slotCount": 13,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-newstory-assets",
    "areaId": "row",
    "areaSlots": {
      "civil-card-row": 13
    }
  },
  {
    "gameId": "hansa-teutonica",
    "fieldKey": "skills.scene",
    "componentId": "tradesmen",
    "slotCount": 115,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "skills",
    "areaSlots": {
      "seat-1-desk": 23,
      "seat-2-desk": 23,
      "seat-3-desk": 23,
      "seat-4-desk": 23,
      "seat-5-desk": 23
    }
  },
  {
    "gameId": "hansa-teutonica",
    "fieldKey": "tracks.scene",
    "componentId": "tradesmen",
    "slotCount": 111,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "tracks",
    "areaSlots": {
      "prestige-track": 100,
      "completed-cities": 11
    }
  },
  {
    "gameId": "pandemic",
    "fieldKey": "status.scene",
    "componentId": "disease",
    "slotCount": 20,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "status",
    "areaSlots": {
      "infection-rate": 7,
      "outbreaks": 9,
      "cures": 4
    }
  },
  {
    "gameId": "splendor-duel",
    "fieldKey": "market.scene",
    "componentId": "cards",
    "slotCount": 19,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "market",
    "areaSlots": {
      "three-level-draw-decks": 3,
      "twelve-card-pyramid": 12,
      "four-royal-card-offers": 4
    }
  },
  {
    "gameId": "heat",
    "fieldKey": "circuit.scene",
    "componentId": "track",
    "slotCount": 144,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "circuit",
    "areaSlots": {
      "active-circuit": 138,
      "hall-of-fame": 6
    }
  },
  {
    "gameId": "heat",
    "fieldKey": "player.scene",
    "componentId": "cars",
    "slotCount": 24,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "player",
    "areaSlots": {
      "seat-1-gear": 4,
      "seat-1-draw": 0,
      "seat-1-engine": 0,
      "seat-1-discard": 0,
      "seat-1-play-area": 0,
      "seat-1-persistent-upgrades": 0,
      "seat-2-gear": 4,
      "seat-2-draw": 0,
      "seat-2-engine": 0,
      "seat-2-discard": 0,
      "seat-2-play-area": 0,
      "seat-2-persistent-upgrades": 0,
      "seat-3-gear": 4,
      "seat-3-draw": 0,
      "seat-3-engine": 0,
      "seat-3-discard": 0,
      "seat-3-play-area": 0,
      "seat-3-persistent-upgrades": 0,
      "seat-4-gear": 4,
      "seat-4-draw": 0,
      "seat-4-engine": 0,
      "seat-4-discard": 0,
      "seat-4-play-area": 0,
      "seat-4-persistent-upgrades": 0,
      "seat-5-gear": 4,
      "seat-5-draw": 0,
      "seat-5-engine": 0,
      "seat-5-discard": 0,
      "seat-5-play-area": 0,
      "seat-5-persistent-upgrades": 0,
      "seat-6-gear": 4,
      "seat-6-draw": 0,
      "seat-6-engine": 0,
      "seat-6-discard": 0,
      "seat-6-play-area": 0,
      "seat-6-persistent-upgrades": 0
    }
  },
  {
    "gameId": "pandemic-legacy-1",
    "fieldKey": "campaign.scene",
    "componentId": "record",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-public-season1-campaign-and-live-session-assets",
    "areaId": "campaign",
    "areaSlots": {
      "whole-status": 0,
      "whole-calendar": 0,
      "whole-materials": 0,
      "whole-live-decks": 0
    }
  },
  {
    "gameId": "seti",
    "fieldKey": "public.scene",
    "componentId": "cards",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-base-rotating-solar-four-agency-five-species-table",
    "areaId": "public",
    "areaSlots": {
      "whole-tech": 0,
      "whole-aliens": 0
    }
  },
  {
    "gameId": "apiary",
    "fieldKey": "actions.scene",
    "componentId": "tiles",
    "players": 5,
    "slotCount": 47,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets-only",
    "areaId": "actions",
    "areaSlots": {
      "explore-grid": 16,
      "explore-workers": 2,
      "advance-farm-workers": 2,
      "advance-recruit-development-workers": 2,
      "farm-offers": 3,
      "recruit-offers": 3,
      "development-offers": 3,
      "grow-worker": 1,
      "research-worker": 1,
      "carve-worker": 1,
      "convert-worker": 1,
      "carving-market": 9,
      "dances": 3
    }
  },
  {
    "gameId": "apiary",
    "fieldKey": "actions.scene",
    "componentId": "tiles",
    "players": 3,
    "slotCount": 47,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets-only",
    "areaId": "actions",
    "areaSlots": {
      "explore-grid": 16,
      "explore-workers": 2,
      "advance-farm-workers": 2,
      "advance-recruit-development-workers": 2,
      "farm-offers": 3,
      "recruit-offers": 3,
      "development-offers": 3,
      "grow-worker": 1,
      "research-worker": 1,
      "carve-worker": 1,
      "convert-worker": 1,
      "carving-market": 9,
      "dances": 3
    }
  },
  {
    "gameId": "marvel-champions",
    "fieldKey": "enemy.scene",
    "componentId": "identities",
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "enemy",
    "areaSlots": {
      "villain-stage": 0,
      "main-scheme": 0,
      "side-schemes": 0,
      "encounter-discard": 0,
      "boost-in-resolution": 0,
      "shared-token-status-bank": 0
    }
  },
  {
    "gameId": "marvel-champions",
    "fieldKey": "hero.scene",
    "componentId": "identities",
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "hero",
    "areaSlots": {
      "engaged-minions-1": 0,
      "hero-identity-1": 0,
      "hero-tableau-1": 0,
      "encounter-waiting-1": 0,
      "engaged-minions-2": 0,
      "hero-identity-2": 0,
      "hero-tableau-2": 0,
      "encounter-waiting-2": 0,
      "engaged-minions-3": 0,
      "hero-identity-3": 0,
      "hero-tableau-3": 0,
      "encounter-waiting-3": 0,
      "engaged-minions-4": 0,
      "hero-identity-4": 0,
      "hero-tableau-4": 0,
      "encounter-waiting-4": 0
    }
  },
  {
    "gameId": "wyrmspan",
    "fieldKey": "caves.scene",
    "componentId": "cards",
    "slotCount": 60,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-base-assets",
    "areaId": "caves",
    "areaSlots": {
      "seat-1-dragons": 12,
      "seat-1-attachments": 0,
      "seat-2-dragons": 12,
      "seat-2-attachments": 0,
      "seat-3-dragons": 12,
      "seat-3-attachments": 0,
      "seat-4-dragons": 12,
      "seat-4-attachments": 0,
      "seat-5-dragons": 12,
      "seat-5-attachments": 0
    }
  },
  {
    "gameId": "wyrmspan",
    "fieldKey": "market.scene",
    "componentId": "cards",
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-base-assets",
    "areaId": "market",
    "areaSlots": {
      "dragon-market": 3,
      "cave-market": 3
    }
  },
  {
    "gameId": "bohnanza",
    "fieldKey": "fields.scene",
    "componentId": "cards",
    "players": 3,
    "slotCount": 10,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "fields",
    "areaSlots": {
      "fields-1": 2,
      "fields-2": 2,
      "fields-3": 2,
      "fields-4": 2,
      "fields-5": 2
    }
  },
  {
    "gameId": "bohnanza",
    "fieldKey": "fields.scene",
    "componentId": "cards",
    "players": 5,
    "slotCount": 10,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "fields",
    "areaSlots": {
      "fields-1": 2,
      "fields-2": 2,
      "fields-3": 2,
      "fields-4": 2,
      "fields-5": 2
    }
  },
  {
    "gameId": "bohnanza",
    "fieldKey": "fields.scene",
    "componentId": "cards",
    "players": 2,
    "slotCount": 10,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "fields",
    "areaSlots": {
      "fields-1": 2,
      "fields-2": 2,
      "fields-3": 2,
      "fields-4": 2,
      "fields-5": 2
    }
  },
  {
    "gameId": "bohnanza",
    "fieldKey": "trade.scene",
    "componentId": "cards",
    "slotCount": 2,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "trade",
    "areaSlots": {
      "received-1": 0,
      "received-2": 0,
      "received-3": 0,
      "received-4": 0,
      "received-5": 0,
      "revealed-two": 2,
      "negotiating": 0
    }
  },
  {
    "gameId": "crew-deep-sea",
    "fieldKey": "trick.scene",
    "componentId": "cards",
    "players": 3,
    "slotCount": 3,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "trick",
    "areaSlots": {
      "trick-seat-1": 1,
      "trick-seat-2": 1,
      "trick-seat-3": 1
    }
  },
  {
    "gameId": "crew-deep-sea",
    "fieldKey": "trick.scene",
    "componentId": "cards",
    "players": 4,
    "slotCount": 4,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "trick",
    "areaSlots": {
      "trick-seat-1": 1,
      "trick-seat-2": 1,
      "trick-seat-3": 1,
      "trick-seat-4": 1
    }
  },
  {
    "gameId": "crew-deep-sea",
    "fieldKey": "trick.scene",
    "componentId": "cards",
    "players": 5,
    "slotCount": 5,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "trick",
    "areaSlots": {
      "trick-seat-1": 1,
      "trick-seat-2": 1,
      "trick-seat-3": 1,
      "trick-seat-4": 1,
      "trick-seat-5": 1
    }
  },
  {
    "gameId": "crew-deep-sea",
    "fieldKey": "trick.scene",
    "componentId": "cards",
    "players": 2,
    "slotCount": 5,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "trick",
    "areaSlots": {
      "trick-seat-1": 1,
      "trick-seat-2": 1,
      "trick-seat-3": 1,
      "trick-seat-4": 1,
      "trick-seat-5": 1
    }
  },
  {
    "gameId": "crew-deep-sea",
    "fieldKey": "communication.scene",
    "componentId": "cards",
    "players": 5,
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "communication",
    "areaSlots": {
      "communication-1": 0,
      "communication-2": 0,
      "communication-3": 0,
      "communication-4": 0,
      "communication-5": 0
    }
  },
  {
    "gameId": "crew-deep-sea",
    "fieldKey": "communication.scene",
    "componentId": "tokens",
    "players": 5,
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "communication",
    "areaSlots": {
      "communication-1": 0,
      "communication-2": 0,
      "communication-3": 0,
      "communication-4": 0,
      "communication-5": 0
    }
  },
  {
    "gameId": "crew-deep-sea",
    "fieldKey": "communication.scene",
    "componentId": "tokens",
    "players": 2,
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "communication",
    "areaSlots": {
      "communication-1": 0,
      "communication-2": 0,
      "communication-3": 0,
      "communication-4": 0,
      "communication-5": 0
    }
  },
  {
    "gameId": "paleo",
    "fieldKey": "camp.scene",
    "componentId": "progress",
    "slotCount": 9,
    "input": "slot",
    "status": "complete",
    "recordingMode": "full-table-schematic",
    "areaId": "camp",
    "areaSlots": {
      "base-camp-decks": 3,
      "secret-deck": 1,
      "night-skulls": 5,
      "mission-cards": 0
    }
  },
  {
    "gameId": "descent-legends-dark",
    "fieldKey": "hero.scene",
    "componentId": "cards",
    "slotCount": 2,
    "input": "slot",
    "status": "partial",
    "recordingMode": "partial-slots",
    "areaId": "hero",
    "areaSlots": {
      "hero-card": 1,
      "attack-sleeve": 1,
      "skills": 0,
      "equipment": 0,
      "health": 0,
      "reference": 0,
      "conditions": 0,
      "injury": 0
    }
  },
  {
    "gameId": "gaia-project",
    "fieldKey": "research.scene",
    "componentId": "tech",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-core-thirteen-sector-faces-four-player-table",
    "areaId": "research",
    "areaSlots": {
      "whole-research": 0,
      "whole-scoring": 0,
      "booster-selection-and-market": 0,
      "federations": 0,
      "qic-power-record-actions": 0,
      "turn-order-solo": 0
    }
  },
  {
    "gameId": "age-of-innovation",
    "fieldKey": "player.scene",
    "componentId": "map",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-two-map-faces-all-five-planning-stations-and-native-automa",
    "areaId": "player",
    "areaSlots": {
      "owner-1": 0,
      "owner-2": 0,
      "owner-3": 0,
      "owner-4": 0,
      "owner-5": 0
    }
  },
  {
    "gameId": "age-of-innovation",
    "fieldKey": "round.scene",
    "componentId": "tiles",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-two-map-faces-all-five-planning-stations-and-native-automa",
    "areaId": "round",
    "areaSlots": {
      "round": 0
    }
  },
  {
    "gameId": "anachrony",
    "fieldKey": "timeline.scene",
    "componentId": "boards",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-essential-capital-timeline-four-paths-all-player-mats",
    "areaId": "timeline",
    "areaSlots": {
      "whole-timeline": 0
    }
  },
  {
    "gameId": "anachrony",
    "fieldKey": "player.scene",
    "componentId": "buildings",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-essential-capital-timeline-four-paths-all-player-mats",
    "areaId": "player",
    "areaSlots": {
      "seat-1-player": 0,
      "seat-2-player": 0,
      "seat-3-player": 0,
      "seat-4-player": 0
    }
  },
  {
    "gameId": "star-wars-outer-rim",
    "fieldKey": "market.scene",
    "componentId": "cards",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-core-galaxy-four-owner-table-all18-native-ship-faces",
    "areaId": "market",
    "areaSlots": {
      "whole-card-supply": 0,
      "whole-shared-tokens": 0
    }
  },
  {
    "gameId": "terra-mystica",
    "fieldKey": "faction.scene",
    "componentId": "buildings",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-original-map-fourteen-factions-five-players",
    "areaId": "faction",
    "areaSlots": {
      "seat-1-faction": 0,
      "seat-1-bonus": 0,
      "seat-1-favor": 0,
      "seat-1-town": 0,
      "seat-2-faction": 0,
      "seat-2-bonus": 0,
      "seat-2-favor": 0,
      "seat-2-town": 0,
      "seat-3-faction": 0,
      "seat-3-bonus": 0,
      "seat-3-favor": 0,
      "seat-3-town": 0,
      "seat-4-faction": 0,
      "seat-4-bonus": 0,
      "seat-4-favor": 0,
      "seat-4-town": 0,
      "seat-5-faction": 0,
      "seat-5-bonus": 0,
      "seat-5-favor": 0,
      "seat-5-town": 0
    }
  },
  {
    "gameId": "terra-mystica",
    "fieldKey": "cults.scene",
    "componentId": "resources",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-original-map-fourteen-factions-five-players",
    "areaId": "cults",
    "areaSlots": {
      "score-and-actions": 0,
      "whole-cult-board": 0,
      "favor-market": 0,
      "town-market": 0,
      "supply-workers": 0,
      "supply-coins": 0,
      "supply-power": 0,
      "supply-terrain": 0,
      "supply-unused-round-tiles": 0,
      "bonus-market": 0
    }
  },
  {
    "gameId": "dune-imperium-uprising",
    "fieldKey": "board.scene",
    "componentId": "resources",
    "slotCount": 35,
    "input": "free",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "board",
    "areaSlots": {
      "action-sardaukar": 1,
      "action-dutiful-service": 1,
      "action-heighliner": 1,
      "action-deliver-supplies": 1,
      "action-espionage": 1,
      "action-secrets": 1,
      "action-desert-tactics": 1,
      "action-fremkit": 1,
      "action-high-council": 1,
      "action-imperial-privilege": 1,
      "action-swordmaster": 1,
      "action-assembly-hall": 1,
      "action-gather-support": 1,
      "action-shipping": 1,
      "action-accept-contract": 1,
      "action-research-station": 1,
      "action-sietch-tabr": 1,
      "action-spice-refinery": 1,
      "action-arrakeen": 1,
      "action-deep-desert": 1,
      "action-hagga-basin": 1,
      "action-imperial-basin": 1,
      "post-emperor": 1,
      "post-guild": 1,
      "post-gesserit": 1,
      "post-fremen": 1,
      "post-privilege-swordmaster": 1,
      "post-assembly-gather": 1,
      "post-shipping-contract": 1,
      "post-research-sietch": 1,
      "post-research-refinery": 1,
      "post-refinery-arrakeen": 1,
      "post-deep-desert": 1,
      "post-hagga-basin": 1,
      "post-imperial-basin": 1,
      "seat-1-leader": 0,
      "seat-1-wallet": 0,
      "seat-2-leader": 0,
      "seat-2-wallet": 0,
      "seat-3-leader": 0,
      "seat-3-wallet": 0,
      "seat-4-leader": 0,
      "seat-4-wallet": 0
    }
  },
  {
    "gameId": "dune-imperium-uprising",
    "fieldKey": "conflict.scene",
    "componentId": "troops",
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "conflict",
    "areaSlots": {
      "seat-1-garrison": 0,
      "seat-1-conflict": 0,
      "seat-2-garrison": 0,
      "seat-2-conflict": 0,
      "seat-3-garrison": 0,
      "seat-3-conflict": 0,
      "seat-4-garrison": 0,
      "seat-4-conflict": 0
    }
  },
  {
    "gameId": "dune-imperium-uprising",
    "fieldKey": "display.scene",
    "componentId": "cards",
    "slotCount": 5,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "display",
    "areaSlots": {
      "imperium-1": 1,
      "imperium-2": 1,
      "imperium-3": 1,
      "imperium-4": 1,
      "imperium-5": 1,
      "imperium-deck": 0,
      "intrigue-deck": 0,
      "prepare-the-way": 0,
      "spice-must-flow": 0,
      "conflict-deck": 0,
      "current-conflict": 0,
      "removed-cards": 0,
      "unselected-objectives": 0,
      "unused-leaders": 0,
      "seat-1-agent-play": 0,
      "seat-1-reveal-play": 0,
      "seat-1-won-conflicts": 0,
      "seat-2-agent-play": 0,
      "seat-2-reveal-play": 0,
      "seat-2-won-conflicts": 0,
      "seat-3-agent-play": 0,
      "seat-3-reveal-play": 0,
      "seat-3-won-conflicts": 0,
      "seat-4-agent-play": 0,
      "seat-4-reveal-play": 0,
      "seat-4-won-conflicts": 0
    }
  },
  {
    "gameId": "dune-imperium-uprising",
    "fieldKey": "hand.scene",
    "componentId": "cards",
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "hand",
    "areaSlots": {
      "seat-1-hand": 0,
      "seat-1-intrigue": 0,
      "seat-2-hand": 0,
      "seat-2-intrigue": 0,
      "seat-3-hand": 0,
      "seat-3-intrigue": 0,
      "seat-4-hand": 0,
      "seat-4-intrigue": 0
    }
  },
  {
    "gameId": "istanbul",
    "fieldKey": "city.scene",
    "componentId": "places",
    "players": 2,
    "slotCount": 44,
    "input": "slot",
    "status": "complete",
    "recordingMode": "asset-model-only",
    "areaId": "city",
    "areaSlots": {
      "city": 16,
      "people-on-city": 0,
      "common-board": 28
    }
  },
  {
    "gameId": "istanbul",
    "fieldKey": "wheelbarrow.scene",
    "componentId": "goods",
    "players": 2,
    "slotCount": 33,
    "input": "slot",
    "status": "complete",
    "recordingMode": "asset-model-only",
    "areaId": "wheelbarrow",
    "areaSlots": {
      "player-wheelbarrow": 33
    }
  },
  {
    "gameId": "istanbul",
    "fieldKey": "wheelbarrow.scene",
    "componentId": "goods",
    "players": 3,
    "slotCount": 33,
    "input": "slot",
    "status": "complete",
    "recordingMode": "asset-model-only",
    "areaId": "wheelbarrow",
    "areaSlots": {
      "player-wheelbarrow": 33
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "writing.scene",
    "componentId": "boards",
    "players": 3,
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": null,
    "areaId": "writing",
    "areaSlots": {
      "writing-seat-1": 0,
      "writing-seat-2": 0,
      "writing-seat-3": 0
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "writing.scene",
    "componentId": "boards",
    "players": 5,
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": null,
    "areaId": "writing",
    "areaSlots": {
      "writing-seat-1": 0,
      "writing-seat-2": 0,
      "writing-seat-3": 0,
      "writing-seat-4": 0,
      "writing-seat-5": 0
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 3,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 4,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 5,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 6,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 7,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  }
]);});

test("Apiary exposes only the verified 4\u20135 player action board, not those slots for 1\u20133 players (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "apiary",
    "fieldKey": "actions.scene",
    "componentId": "tiles",
    "players": 5,
    "slotCount": 47,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets-only",
    "areaId": "actions",
    "areaSlots": {
      "explore-grid": 16,
      "explore-workers": 2,
      "advance-farm-workers": 2,
      "advance-recruit-development-workers": 2,
      "farm-offers": 3,
      "recruit-offers": 3,
      "development-offers": 3,
      "grow-worker": 1,
      "research-worker": 1,
      "carve-worker": 1,
      "convert-worker": 1,
      "carving-market": 9,
      "dances": 3
    }
  },
  {
    "gameId": "apiary",
    "fieldKey": "actions.scene",
    "componentId": "tiles",
    "players": 3,
    "slotCount": 47,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets-only",
    "areaId": "actions",
    "areaSlots": {
      "explore-grid": 16,
      "explore-workers": 2,
      "advance-farm-workers": 2,
      "advance-recruit-development-workers": 2,
      "farm-offers": 3,
      "recruit-offers": 3,
      "development-offers": 3,
      "grow-worker": 1,
      "research-worker": 1,
      "carve-worker": 1,
      "convert-worker": 1,
      "carving-market": 9,
      "dances": 3
    }
  }
]);});

test("Outer Rim current free market retains editable cards without invented slots (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "star-wars-outer-rim",
    "fieldKey": "market.scene",
    "componentId": "cards",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-core-galaxy-four-owner-table-all18-native-ship-faces",
    "areaId": "market",
    "areaSlots": {
      "whole-card-supply": 0,
      "whole-shared-tokens": 0
    }
  }
]);});

test("Terra Mystica current faction and cult free areas save distinct pieces (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "terra-mystica",
    "fieldKey": "faction.scene",
    "componentId": "buildings",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-original-map-fourteen-factions-five-players",
    "areaId": "faction",
    "areaSlots": {
      "seat-1-faction": 0,
      "seat-1-bonus": 0,
      "seat-1-favor": 0,
      "seat-1-town": 0,
      "seat-2-faction": 0,
      "seat-2-bonus": 0,
      "seat-2-favor": 0,
      "seat-2-town": 0,
      "seat-3-faction": 0,
      "seat-3-bonus": 0,
      "seat-3-favor": 0,
      "seat-3-town": 0,
      "seat-4-faction": 0,
      "seat-4-bonus": 0,
      "seat-4-favor": 0,
      "seat-4-town": 0,
      "seat-5-faction": 0,
      "seat-5-bonus": 0,
      "seat-5-favor": 0,
      "seat-5-town": 0
    }
  },
  {
    "gameId": "terra-mystica",
    "fieldKey": "cults.scene",
    "componentId": "resources",
    "slotCount": 0,
    "input": "surface",
    "status": "complete",
    "recordingMode": "whole-original-map-fourteen-factions-five-players",
    "areaId": "cults",
    "areaSlots": {
      "score-and-actions": 0,
      "whole-cult-board": 0,
      "favor-market": 0,
      "town-market": 0,
      "supply-workers": 0,
      "supply-coins": 0,
      "supply-power": 0,
      "supply-terrain": 0,
      "supply-unused-round-tiles": 0,
      "bonus-market": 0
    }
  }
]);});

test("Dune Imperium current fields preserve separate shared and player records (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "dune-imperium-uprising",
    "fieldKey": "board.scene",
    "componentId": "resources",
    "slotCount": 35,
    "input": "free",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "board",
    "areaSlots": {
      "action-sardaukar": 1,
      "action-dutiful-service": 1,
      "action-heighliner": 1,
      "action-deliver-supplies": 1,
      "action-espionage": 1,
      "action-secrets": 1,
      "action-desert-tactics": 1,
      "action-fremkit": 1,
      "action-high-council": 1,
      "action-imperial-privilege": 1,
      "action-swordmaster": 1,
      "action-assembly-hall": 1,
      "action-gather-support": 1,
      "action-shipping": 1,
      "action-accept-contract": 1,
      "action-research-station": 1,
      "action-sietch-tabr": 1,
      "action-spice-refinery": 1,
      "action-arrakeen": 1,
      "action-deep-desert": 1,
      "action-hagga-basin": 1,
      "action-imperial-basin": 1,
      "post-emperor": 1,
      "post-guild": 1,
      "post-gesserit": 1,
      "post-fremen": 1,
      "post-privilege-swordmaster": 1,
      "post-assembly-gather": 1,
      "post-shipping-contract": 1,
      "post-research-sietch": 1,
      "post-research-refinery": 1,
      "post-refinery-arrakeen": 1,
      "post-deep-desert": 1,
      "post-hagga-basin": 1,
      "post-imperial-basin": 1,
      "seat-1-leader": 0,
      "seat-1-wallet": 0,
      "seat-2-leader": 0,
      "seat-2-wallet": 0,
      "seat-3-leader": 0,
      "seat-3-wallet": 0,
      "seat-4-leader": 0,
      "seat-4-wallet": 0
    }
  },
  {
    "gameId": "dune-imperium-uprising",
    "fieldKey": "conflict.scene",
    "componentId": "troops",
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "conflict",
    "areaSlots": {
      "seat-1-garrison": 0,
      "seat-1-conflict": 0,
      "seat-2-garrison": 0,
      "seat-2-conflict": 0,
      "seat-3-garrison": 0,
      "seat-3-conflict": 0,
      "seat-4-garrison": 0,
      "seat-4-conflict": 0
    }
  },
  {
    "gameId": "dune-imperium-uprising",
    "fieldKey": "display.scene",
    "componentId": "cards",
    "slotCount": 5,
    "input": "slot",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "display",
    "areaSlots": {
      "imperium-1": 1,
      "imperium-2": 1,
      "imperium-3": 1,
      "imperium-4": 1,
      "imperium-5": 1,
      "imperium-deck": 0,
      "intrigue-deck": 0,
      "prepare-the-way": 0,
      "spice-must-flow": 0,
      "conflict-deck": 0,
      "current-conflict": 0,
      "removed-cards": 0,
      "unselected-objectives": 0,
      "unused-leaders": 0,
      "seat-1-agent-play": 0,
      "seat-1-reveal-play": 0,
      "seat-1-won-conflicts": 0,
      "seat-2-agent-play": 0,
      "seat-2-reveal-play": 0,
      "seat-2-won-conflicts": 0,
      "seat-3-agent-play": 0,
      "seat-3-reveal-play": 0,
      "seat-3-won-conflicts": 0,
      "seat-4-agent-play": 0,
      "seat-4-reveal-play": 0,
      "seat-4-won-conflicts": 0
    }
  },
  {
    "gameId": "dune-imperium-uprising",
    "fieldKey": "hand.scene",
    "componentId": "cards",
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": "whole-table-assets",
    "areaId": "hand",
    "areaSlots": {
      "seat-1-hand": 0,
      "seat-1-intrigue": 0,
      "seat-2-hand": 0,
      "seat-2-intrigue": 0,
      "seat-3-hand": 0,
      "seat-3-intrigue": 0,
      "seat-4-hand": 0,
      "seat-4-intrigue": 0
    }
  }
]);});

test("Istanbul current city and personal storage preserve placements across player counts (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "istanbul",
    "fieldKey": "city.scene",
    "componentId": "places",
    "players": 2,
    "slotCount": 44,
    "input": "slot",
    "status": "complete",
    "recordingMode": "asset-model-only",
    "areaId": "city",
    "areaSlots": {
      "city": 16,
      "people-on-city": 0,
      "common-board": 28
    }
  },
  {
    "gameId": "istanbul",
    "fieldKey": "wheelbarrow.scene",
    "componentId": "goods",
    "players": 2,
    "slotCount": 33,
    "input": "slot",
    "status": "complete",
    "recordingMode": "asset-model-only",
    "areaId": "wheelbarrow",
    "areaSlots": {
      "player-wheelbarrow": 33
    }
  },
  {
    "gameId": "istanbul",
    "fieldKey": "wheelbarrow.scene",
    "componentId": "goods",
    "players": 3,
    "slotCount": 33,
    "input": "slot",
    "status": "complete",
    "recordingMode": "asset-model-only",
    "areaId": "wheelbarrow",
    "areaSlots": {
      "player-wheelbarrow": 33
    }
  }
]);});

test("Just One persists the personal and public easel positions within their original field scopes (current whole-table layout)",async()=>{await currentBoardRoundtrip([
  {
    "gameId": "just-one",
    "fieldKey": "writing.scene",
    "componentId": "boards",
    "players": 3,
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": null,
    "areaId": "writing",
    "areaSlots": {
      "writing-seat-1": 0,
      "writing-seat-2": 0,
      "writing-seat-3": 0
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "writing.scene",
    "componentId": "boards",
    "players": 5,
    "slotCount": 0,
    "input": "free",
    "status": "complete",
    "recordingMode": null,
    "areaId": "writing",
    "areaSlots": {
      "writing-seat-1": 0,
      "writing-seat-2": 0,
      "writing-seat-3": 0,
      "writing-seat-4": 0,
      "writing-seat-5": 0
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 3,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 4,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 5,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 6,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  },
  {
    "gameId": "just-one",
    "fieldKey": "clues.scene",
    "componentId": "boards",
    "players": 7,
    "slotCount": 6,
    "input": "slot",
    "status": "complete",
    "recordingMode": null,
    "areaId": "clues",
    "areaSlots": {
      "surviving-clues": 6
    }
  }
]);});

test('Seven Wonders Duel selects and saves the matching age layout without reinterpreting placements', async () => {
  const originalFetch = globalThis.fetch;
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const directory = '../public/game-art/real-boards/seven-wonders-duel/';
  const boardFiles = new Map<string, any>();
  for (const name of ['board.json', 'variants/board-age-2.json', 'variants/board-age-3.json']) {
    boardFiles.set(name, JSON.parse(await readFile(new URL(directory + name, import.meta.url), 'utf8')));
  }
  const symbols = await readFile(new URL(directory + 'pieces.svg', import.meta.url), 'utf8');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/game-art/boards/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    const match = url.match(/\/game-art\/real-boards\/seven-wonders-duel\/(board\.json|variants\/board-age-[23]\.json|pieces\.svg)$/);
    if (!match) return new Response('', { status: 404 });
    if (match[1] === 'pieces.svg') return new Response(symbols, { status: 200 });
    return new Response(JSON.stringify(boardFiles.get(match[1])), { status: 200 });
  }) as typeof fetch;
  try {
    const pack = catalogPacks.find(candidate => candidate.id === 'seven-wonders-duel')!;
    const ageTwo = await loadRealAssets('seven-wonders-duel', 'age-2');
    assert.equal(ageTwo?.board.variant, 'age-2');
    assert.equal(ageTwo?.variantSelector?.field, 'age');
    assert.equal(realAreasFor(ageTwo!.board, 'structure.scene').flatMap(area => area.slots).length, 20);

    const piece = { id: 'age-two-card', componentId: 'cards', variant: null, quantity: 1, label: '시대 카드', anchor: '', evidenceId: null, region: null };
    const record: GenericRecord = { version: 'game-component-record-v1', pieces: [piece] };
    let saved: GenericRecord | undefined;
    let requestedLayout = '';
    const props = { pack, fieldKey: 'structure.scene', record, selected: piece.id, busy: false, layoutVariant: 'age-2', onLayoutVariantChange: (next: string) => { requestedLayout = next; }, onChange: (next: GenericRecord) => { saved = next; } };
    const ui = mount(GameBoardRecord, props);
    try {
      await new Promise(resolve => setImmediate(resolve)); ui.render();
      const selector = find(ui.tree, node => node.type === 'select' && node.props['aria-label'] === '판 구성');
      assert.equal(selector.props.value, 'age-2');
      selector.props.onChange({ target: { value: 'age-3' } });
      assert.equal(requestedLayout, 'age-3');
      const slots = nodes(ui.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot'));
      assert.equal(slots.length, 20);
      const empty = slots.find(node => !String(node.props.className).includes('filled') && !node.props.disabled);
      assert(empty, 'age II should expose an available card position');
      empty.props.onClick();
      assert.equal(saved?.pieces[0].placement?.layoutVariant, 'age-2');
      const validated = validateGenericRecord(saved as any, pack, 'structure.scene', []);
      assert.equal(validated.pieces[0].placement?.layoutVariant, 'age-2');

      const otherAge = mount(GameBoardRecord, { ...props, record: validated, layoutVariant: 'age-3', onChange() {} });
      try {
        await new Promise(resolve => setImmediate(resolve)); otherAge.render();
        const ageThreeSlots = nodes(otherAge.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot'));
        assert.equal(ageThreeSlots.length, 20);
        assert.equal(ageThreeSlots.filter(node => String(node.props.className).includes('filled')).length, 0);
        find(otherAge.tree, node => node.type === 'div' && node.props['aria-label'] === '미배치 구성물');
        const preservedTrayPiece = find(otherAge.tree, node => node.type === 'button' && String(node.props.className).includes('gb-piece'));
        assert.equal(preservedTrayPiece.props['aria-label'], '시대 카드, 1개');
        assert(!String(preservedTrayPiece.props.className).includes('placed'));
      } finally { otherAge.dispose(); }

      const reopened = mount(GameBoardRecord, { ...props, record: validated, layoutVariant: 'age-2', onChange() {} });
      try {
        await new Promise(resolve => setImmediate(resolve)); reopened.render();
        const reopenedSlots = nodes(reopened.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot'));
        assert.equal(reopenedSlots.filter(node => String(node.props.className).includes('filled')).length, 1);
      } finally { reopened.dispose(); }
    } finally { ui.dispose(); }
  } finally { globalThis.fetch = originalFetch; }
});
