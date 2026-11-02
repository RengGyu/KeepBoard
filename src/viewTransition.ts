import { flushSync } from 'react-dom';

/** How the next screen change should move: a tab swap cross-fades, opening a board pushes in, leaving it pops back. */
export type Motion = 'tab' | 'forward' | 'back';
type TransitionDocument = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

/**
 * Runs a React state change inside a View Transition when the browser has one and motion is allowed.
 * `shared` names an element in the old and new screens (a board's title) so the browser morphs it between them.
 * Without support, or under reduced motion, the change simply happens.
 */
export function withTransition(kind: Motion, update: () => void, shared?: { from?: () => Element | null; to?: () => Element | null }) {
  const doc = typeof document === 'undefined' ? undefined : document as TransitionDocument;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc?.startViewTransition || reduce) { update(); return; }
  const tagged: HTMLElement[] = [];
  const tag = (element: Element | null | undefined) => { if (element instanceof HTMLElement) { element.style.viewTransitionName = 'board-title'; tagged.push(element); } };
  tag(shared?.from?.());
  doc.documentElement.dataset.motion = kind;
  const transition = doc.startViewTransition(() => {
    for (const element of tagged.splice(0)) element.style.viewTransitionName = '';
    flushSync(update);
    tag(shared?.to?.());
  });
  transition.finished.finally(() => {
    delete doc.documentElement.dataset.motion;
    for (const element of tagged.splice(0)) element.style.viewTransitionName = '';
  });
}
