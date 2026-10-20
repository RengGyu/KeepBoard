import type { SessionView } from '../shared/types';
import { isSceneField } from '../shared/sceneFields';

/** Catan has one shared physical board; owner-scoped records are catalogs, even with legacy board coordinates. */
export function sceneWorkspaceData(view: SessionView, ownerId?: string) {
  const catalogOnly = view.pack.id === 'catan-base' && !!ownerId;
  const fields = view.pack.fields.filter(field => field.scope === (ownerId ? 'player' : 'public') && isSceneField(field));
  const assertions = view.session.assertions.filter(a => a.ownerId === ownerId && fields.some(f => f.key === a.field));
  const evidence = [...new Map([...(view.session.snapshots.at(-1)?.evidence ?? []), ...view.session.evidence].filter(item =>
    catalogOnly ? item.scope === 'player' && item.ownerId === ownerId : item.scope === 'public' || !!ownerId && item.ownerId === ownerId
  ).map(item => [item.id, item])).values()];
  return { catalogOnly, fields, assertions, evidence, visible: !catalogOnly || assertions.length > 0 || evidence.length > 0 };
}
