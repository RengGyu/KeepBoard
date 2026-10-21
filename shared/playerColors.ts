import type { Player } from './types';
import { canEditOwner } from './sceneEditing';
import type { ComponentScene } from './scene';

export const DEFAULT_PLAYERS: readonly Player[] = [
  { id: 'red', name: '빨강', color: '#cf6656' },
  { id: 'blue', name: '파랑', color: '#5c83a8' },
  { id: 'white', name: '흰색', color: '#d1c7b7' },
];

const COLORS: Record<string, string> = { red:'#c44837',빨강:'#c44837',빨간색:'#c44837',blue:'#3b78a4',파랑:'#3b78a4',파란색:'#3b78a4',white:'#f1eadb',흰색:'#f1eadb',ivory:'#f1eadb',아이보리:'#f1eadb',orange:'#db8a32',주황:'#db8a32',주황색:'#db8a32',green:'#58836a',초록:'#58836a',yellow:'#d5b344',노랑:'#d5b344',black:'#383d3a',검정:'#383d3a',brown:'#8e6750',갈색:'#8e6750',purple:'#8b6fa0',보라:'#8b6fa0' };
export function observedColorCSS(value?: string | null): string | undefined {
  const text = value?.trim().toLowerCase();
  if (!text) return undefined;
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  if (/^#[0-9a-f]{3}$/.test(text)) return '#' + [...text.slice(1)].map(c=>c+c).join('');
  return COLORS[text];
}
/** Explicit user linking only; never guesses a player from color or an id such as "red". */
export function linkObservedColor(scene: ComponentScene, sourceId: string, ownerId: string | null): ComponentScene {
  const source = scene.components.find(c=>c.id===sourceId);
  if (!source || !canEditOwner(source.kind)) return scene;
  const color = observedColorCSS(source.observedColor) ?? source.observedColor?.trim().toLowerCase();
  return { ...scene, components: scene.components.map(c=> {
    const same = color && (observedColorCSS(c.observedColor) ?? c.observedColor?.trim().toLowerCase()) === color;
    return c.id === sourceId || canEditOwner(c.kind) && same && (c.ownerId === null || c.ownerId === source.ownerId) ? { ...c, ownerId } : c;
  }) };
}
