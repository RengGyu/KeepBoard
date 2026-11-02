// Touch gestures for the phone shell. Each attach* wires plain DOM listeners and returns its cleanup,
// moves elements with `transform` only, and leaves a non-gesture path in the UI (a menu item, a button).

const PULL_TRIGGER = 64, PULL_MAX = 96;
const isTouch = (event: PointerEvent) => event.pointerType === 'touch' || event.pointerType === 'pen';

/** Pull down at the top of a list to refresh. The indicator follows the finger with damping, then spins until done. */
export function attachPullToRefresh(indicator: HTMLElement, onRefresh: () => Promise<unknown>, enabled: () => boolean) {
  let startY = 0, distance = 0, active = false, busy = false;
  const place = (y: number, animate: boolean) => {
    indicator.style.transition = animate ? 'transform var(--dur-2) var(--ease-out), opacity var(--dur-2)' : 'none';
    // At rest it waits above the screen edge; while pulled it follows the finger and fades in.
    indicator.style.transform = y ? `translate3d(-50%, ${y}px, 0)` : 'translate3d(-50%, -160%, 0)';
    indicator.style.opacity = y ? String(Math.min(1, y / 40)) : '0';
    indicator.style.setProperty('--pull', `${y * 4}deg`);
  };
  const start = (event: TouchEvent) => {
    active = !busy && enabled() && window.scrollY <= 0 && event.touches.length === 1 && !document.querySelector('.modal-backdrop');
    startY = event.touches[0]?.clientY ?? 0; distance = 0;
  };
  const move = (event: TouchEvent) => {
    if (!active) return;
    const dy = (event.touches[0]?.clientY ?? startY) - startY;
    if (dy <= 0 || window.scrollY > 0) { if (distance) place(0, true); distance = 0; return; }
    distance = Math.min(PULL_MAX, dy * 0.5);
    place(distance, false);
  };
  const end = () => {
    if (!active) return; active = false;
    if (distance < PULL_TRIGGER) { place(0, true); return; }
    busy = true; place(PULL_TRIGGER, true); indicator.classList.add('is-refreshing');
    // Keep the spin on screen long enough to read as an answer, even when the list comes back at once.
    void Promise.allSettled([onRefresh(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => { busy = false; indicator.classList.remove('is-refreshing'); place(0, true); });
  };
  window.addEventListener('touchstart', start, { passive: true });
  window.addEventListener('touchmove', move, { passive: true });
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);
  return () => {
    window.removeEventListener('touchstart', start); window.removeEventListener('touchmove', move);
    window.removeEventListener('touchend', end); window.removeEventListener('touchcancel', end);
  };
}

/** Swipe a board card left to reveal and commit delete. A short flick counts as well as a long drag. */
export function attachSwipeToDelete(root: HTMLElement, onDelete: (id: string) => void) {
  let card: HTMLElement | null = null, content: HTMLElement | null = null;
  let startX = 0, startY = 0, startTime = 0, dx = 0, mode: 'pending' | 'swipe' | 'scroll' = 'pending';
  const settle = (x: number) => {
    if (!content) return;
    content.style.transition = 'transform var(--dur-2) var(--ease-out)';
    content.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
  };
  const down = (event: PointerEvent) => {
    if (!isTouch(event)) return;
    card = (event.target as Element).closest<HTMLElement>('.session-card[data-swipe]');
    content = card?.querySelector<HTMLElement>('.session-open') ?? null;
    if (!card || !content) { card = content = null; return; }
    startX = event.clientX; startY = event.clientY; startTime = event.timeStamp; dx = 0; mode = 'pending';
  };
  const move = (event: PointerEvent) => {
    if (!card || !content || mode === 'scroll') return;
    const x = event.clientX - startX, y = event.clientY - startY;
    if (mode === 'pending') {
      if (Math.abs(x) < 8 && Math.abs(y) < 8) return;
      mode = x < 0 && Math.abs(x) > Math.abs(y) * 1.2 ? 'swipe' : 'scroll';
      if (mode === 'scroll') return;
      card.setPointerCapture(event.pointerId);
      card.classList.add('is-swiping');
    }
    dx = x < 0 ? Math.max(x, -card.offsetWidth) : x * 0.2;
    content.style.transition = 'none';
    content.style.transform = `translate3d(${dx}px, 0, 0)`;
  };
  const up = (event: PointerEvent) => {
    if (!card || !content) return;
    const target = card, id = card.dataset.session;
    if (mode === 'swipe') {
      target.dataset.swiped = '1';
      const velocity = -dx / Math.max(1, event.timeStamp - startTime);
      if (id && (-dx > target.offsetWidth * 0.4 || (velocity > 0.6 && -dx > 40))) {
        settle(-target.offsetWidth);
        setTimeout(() => onDelete(id), 160);
        setTimeout(() => { if (target.isConnected) { target.classList.remove('is-swiping'); target.querySelector<HTMLElement>('.session-open')!.style.transform = ''; } }, 1500);
      } else { settle(0); setTimeout(() => target.classList.remove('is-swiping'), 200); }
    }
    card = content = null; mode = 'pending';
  };
  const cancel = () => { if (mode === 'swipe') settle(0); card?.classList.remove('is-swiping'); card = content = null; mode = 'pending'; };
  // A swipe ends with a click on the card's open button; swallow that one click.
  const click = (event: MouseEvent) => {
    const swiped = (event.target as Element).closest<HTMLElement>('.session-card[data-swiped]');
    if (swiped) { delete swiped.dataset.swiped; event.preventDefault(); event.stopPropagation(); }
  };
  root.addEventListener('pointerdown', down);
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('click', click, true);
  return () => {
    root.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', cancel);
    root.removeEventListener('click', click, true);
  };
}

/** Drag a bottom sheet down by its handle or header to close it. Upward drag meets friction instead of a wall. */
export function attachSheetDrag(panel: HTMLElement, grip: HTMLElement[], onClose: () => void) {
  let startY = 0, startTime = 0, dy = 0, dragging = false;
  const backdrop = () => panel.parentElement;
  const down = (event: PointerEvent) => {
    if (!isTouch(event) || !matchMedia('(max-width: 760px)').matches) return;
    if ((event.target as Element).closest('button, a, input, select, textarea')) return;
    dragging = true; startY = event.clientY; startTime = event.timeStamp; dy = 0;
    panel.style.animation = 'none';
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!dragging) return;
    const y = event.clientY - startY;
    dy = y > 0 ? y : y * 0.2;
    panel.style.transition = 'none';
    panel.style.transform = `translate3d(0, ${dy}px, 0)`;
    const shade = backdrop(); if (shade) shade.style.opacity = String(Math.max(0.3, 1 - Math.max(0, dy) / panel.offsetHeight));
  };
  const up = (event: PointerEvent) => {
    if (!dragging) return; dragging = false;
    const velocity = dy / Math.max(1, event.timeStamp - startTime);
    const shade = backdrop();
    panel.style.transition = 'transform var(--dur-2) var(--ease-out)';
    if (dy > panel.offsetHeight * 0.25 || (velocity > 0.5 && dy > 40)) {
      panel.style.transform = 'translate3d(0, 100%, 0)';
      if (shade) { shade.style.transition = 'opacity var(--dur-2)'; shade.style.opacity = '0'; }
      setTimeout(onClose, 180);
    } else {
      panel.style.transform = '';
      if (shade) { shade.style.transition = 'opacity var(--dur-2)'; shade.style.opacity = ''; }
    }
  };
  for (const element of grip) {
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
  }
  return () => { for (const element of grip) { element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up); } };
}
