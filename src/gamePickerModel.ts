import {drawingEnabled} from '../shared/releaseSupport';
import type { GameCatalogEntry } from '../shared/gameEssentials';
import type {GamePack} from '../shared/types';
import type { Player } from '../shared/types';

// Hangul syllable → initial consonant (초성), so "ㅋㅌ" finds 카탄 on a phone keyboard.
const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
function initials(text: string) {
  return [...text].map(ch => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code <= 11171 ? INITIALS[Math.floor(code / 588)] : ch; }).join('');
}
const compact = (text: string) => text.normalize('NFC').toLowerCase().replace(/[\s·:\-_.,'’()]/g, '');
const onlyInitials = (text: string) => /^[ㄱ-ㅎ]+$/.test(text);
// Native packs keep their printed title (e.g. "CATAN"); generic catalog entries already use the Korean name.
// These aliases only widen search — they are never sent to the API.
const SEARCH_ALIASES: Record<string, readonly string[]> = { 'catan-base': ['카탄', 'Catan'] };

/** Search never changes the selected game; it only narrows what is listed. */
export function filterCatalog(packs: readonly GameCatalogEntry[], query: string): GameCatalogEntry[] {
  const q = compact(query);
  if (!q) return [...packs];
  return packs.filter(pack => {
    const names = [pack.title, ...(SEARCH_ALIASES[pack.id] ?? [])].map(compact);
    if (names.some(name => name.includes(q)) || compact(pack.id).includes(q) || compact(pack.edition).includes(q)) return true;
    return onlyInitials(q) && names.some(name => initials(name).includes(q));
  });
}

export function supportLabel(pack?: GameCatalogEntry|GamePack) {
  return pack&&drawingEnabled(pack)?'그림 복원':'사진 기록';
}

/** The API receives the chosen catalog entry's id and pinned version — never the search text. */
export function createRequest({ name, packId, packs, players }: { name: string; packId: string; packs: readonly GameCatalogEntry[]; players: Player[] }) {
  const pack = packs.find(p => p.id === packId);
  if (!pack) throw new Error('기록할 게임을 선택해 주세요.');
  return { name: name.trim() || undefined, gamePackId: pack.id, gamePackVersion: pack.version, players };
}
