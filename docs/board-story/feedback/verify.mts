import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { BoardEvent, CaptureHelp, CurrentTurnMark, EmptyBoardArt, LoaderMark } from '../../../src/BoardFeedback.tsx';
import { Busy, Empty, PlayerPiece } from '../../../src/ui.tsx';
import { catanPack, createExampleAssertions } from '../../../gamepacks/catan.ts';
import type { SessionView } from '../../../shared/types.ts';

// SSR only: existing privateAccess registers page lifecycle listeners at module load.
// No browser, storage, lifecycle event or API is exercised by this narrow fixture.
globalThis.window = { addEventListener() {} } as unknown as Window & typeof globalThis;
globalThis.fetch = async () => { throw new Error('Network forbidden in synthetic SSR'); };
const { default: SessionWorkspace } = await import('../../../src/SessionWorkspace.tsx');

const out = new URL('./', import.meta.url);
const css = await readFile(new URL('../../../src/board-feedback.css', import.meta.url), 'utf8');
const sessionSource = await readFile(new URL('../../../src/SessionWorkspace.tsx', import.meta.url), 'utf8');
const captureSource = await readFile(new URL('../../../src/Capture.tsx', import.meta.url), 'utf8');
const players = [{ id: 'red', name: '합성 빨강', color: '#bc6048' }, { id: 'blue', name: '합성 파랑', color: '#61879d' }];
const view: SessionView = {
  pack: catanPack,
  session: { id: 'synthetic-feedback-only', name: '합성 그림 확인', createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z', gamePackId: catanPack.id, gamePackVersion: catanPack.version, gamePack: catanPack, captureEpoch: 'synthetic', turnInstanceId: 'synthetic-turn', stage: 'capture', players, evidence: [], assertions: createExampleAssertions(players, 'synthetic-turn', 'synthetic-image'), preservations: [], snapshots: [], notes: {}, activity: [], example: true },
  questions: [], derived: [], briefing: [], ready: false, progress: { resolved: 0, total: 1 }, differences: [],
};
const renderWorkspace = () => render(h(SessionWorkspace, { view, busy: false, status: null, mutate: async () => {}, onBack() {}, setOwnerId: async () => {}, onToast() {} }));
// Exercise actual server-rendered owner tabs, with no real store, network, or AI.
view.session.assertions = view.session.assertions.filter(a => a.field !== 'currentPlayer');
assert.doesNotMatch(renderWorkspace(), /board-turn-mark/);
view.session.assertions.push({ id: 'turn-candidate', field: 'currentPlayer', value: 'blue', status: 'candidate', basis: 'observation', evidenceIds: [], turnInstanceId: 'synthetic-turn', updatedAt: 'now' });
assert.doesNotMatch(renderWorkspace(), /board-turn-mark/);
view.session.assertions.push({ id: 'turn-accepted', field: 'currentPlayer', value: 'red', status: 'accepted', basis: 'user', evidenceIds: [], turnInstanceId: 'synthetic-turn', updatedAt: 'now' });
const marked = renderWorkspace();
const ownerTabs = marked.slice(marked.indexOf('class="owner-tabs"'), marked.indexOf('class="cw-grid"'));
assert.equal((ownerTabs.match(/board-turn-mark/g) || []).length, 1);
assert.match(ownerTabs, /합성 빨강<span class="board-turn-mark"/);
assert.doesNotMatch(ownerTabs, /합성 파랑<span class="board-turn-mark"/);
view.session.assertions.at(-1)!.value = 'invented-player';
assert.doesNotMatch(renderWorkspace(), /board-turn-mark/);
assert.match(render(h(Busy, { label: '보드를 읽는 중' })), /보드를 읽는 중/);
assert.doesNotMatch(render(h(Busy)), /role="status"/); // Parent status regions own the announcement.
assert.match(render(h(Busy, { announce: true })), /role="status"/);
assert.match(render(h(LoaderMark)), /aria-hidden="true"/);
for (const scene of ['boards', 'search', 'trash', 'quiet'] as const) assert.ok(render(h(EmptyBoardArt, { scene })).includes('<svg'));
assert.notEqual(render(h(Empty, { title: '검색 결과가 없어요', children: '다른 이름으로 검색' })), render(h(Empty, { title: '삭제한 보드가 없어요', children: '복원할 보드 없음' })));
assert.match(render(h(PlayerPiece, { game: 'catan-base', color: 'red' })), /component-art/);
assert.match(render(h(PlayerPiece, { game: 'carcassonne', color: 'blue' })), /carcassonne/);
assert.match(render(h(BoardEvent, { kind: 'save' })), /board-event-save.*aria-hidden="true"/);
assert.match(css, /\.board-event\{[^}]*pointer-events:none/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(sessionSource, /await flush\(\); await mutate\(\(\) => api\.commit\(session\.id, true\), '저장했어요'\); if \(alive\.current\) setSaveFeedback/);
assert.ok(captureSource.indexOf('<CaptureHelp/>') > captureSource.indexOf('<div className="modal-body">', captureSource.indexOf('return <Modal title="판을 천천히')));

// Reuse actual product SVG markup. This is an illustration-only contact sheet, never an app screenshot.
function art(element: Parameters<typeof render>[0], x: number, y: number, width: number, height: number, className = '') {
  const markup = render(element), svg = markup.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/)![0];
  return svg.replace(/<svg\b[^>]*>/, `<svg class="${className}" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${svg.match(/viewBox="([^"]+)"/)![1]}">`);
}
const labels = [
  [30, 55, 'EMPTY · 테이블과 상자'], [340, 55, 'SEARCH / TRASH'], [650, 55, 'CAPTURE · 판 위에 평행하게'],
  [30, 265, 'LOADER · 정지 프레임'], [340, 265, 'SAVE / REOPEN · 정지 프레임'], [650, 265, 'PLAYER · 기존 말 + 현재 차례'],
];
const embeddedCss = css.replace(/@keyframes [^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, '').replace(/@media[^]*$/m, '');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="470" viewBox="0 0 960 470"><style>:root{--surface:#fff;--surface-2:#f2f6fc;--line:#dfe6f1;--line-2:#c7d2e3;--ink-2:#34425e;--muted:#5d6b82;--accent:#1f6feb;--accent-soft:#e3efff;--accent-ink:#1557c0;--ok:#08705f}${embeddedCss}svg{--bf-paper:#fff8e7;--bf-wood:#cba97c;--bf-box:#ead5ae;--bf-outline:#34425e;stroke:var(--bf-outline);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.board-loader-die,.board-event-pieces,.board-event-lid{animation:none}.board-event-check{stroke-dashoffset:0}.feedback-sheet-save .board-event-pieces{opacity:0}.feedback-sheet-reopen .board-event-lid{transform:translateY(-21px) rotate(-12deg)}text{stroke:none;font:14px system-ui,sans-serif;fill:#34425e}</style><rect width="960" height="470" fill="#eef3fa" stroke="none"/><text x="30" y="27" style="font-weight:700">KEEPBOARD · 그림만 / 실제 앱 화면 캡처 아님</text>`;
for (const [x,y,label] of labels) svg += `<text x="${x}" y="${y}">${label}</text>`;
svg += art(h(EmptyBoardArt), 30, 65, 250, 155);
svg += art(h(EmptyBoardArt, { scene: 'search' }), 330, 65, 150, 150) + art(h(EmptyBoardArt, { scene: 'trash' }), 480, 65, 150, 150);
svg += art(h(CaptureHelp), 670, 65, 230, 155);
svg += art(h(LoaderMark), 65, 300, 60, 60, 'board-loader-mark') + art(h(LoaderMark), 170, 320, 24, 24, 'board-loader-mark');
svg += art(h(BoardEvent, { kind: 'save' }), 330, 285, 160, 120, 'feedback-sheet-save') + art(h(BoardEvent, { kind: 'reopen' }), 485, 285, 160, 120, 'board-event-reopen feedback-sheet-reopen');
svg += art(h(PlayerPiece, { game: 'catan-base', color: '#bc6048' }), 675, 300, 58, 58) + art(h(CurrentTurnMark), 733, 307, 25, 25, 'board-turn-mark');
svg += art(h(PlayerPiece, { game: 'carcassonne', color: '#61879d' }), 805, 300, 58, 58);
svg += '<text x="30" y="447">SVG 원본 재사용 · 애니메이션/화면폭/탭 크기/실제 클릭 흐름은 이 시트로 검증하지 않음</text></svg>';
await writeFile(new URL('contact-sheet.svg', out), svg);
await writeFile(new URL('verification.json', out), JSON.stringify({ status: 'VERIFIED', syntheticSSR: true, networkOrRealStoreAccess: false, checks: ['unknown/candidate current player never gets token', 'only accepted existing player gets owner-tab token', 'unknown player id gets no token', 'existing Catan settlement and Carcassonne follower preserved', 'loader decorative and Busy announcement opt-in', 'empty/search/trash distinct', 'event decorative and pointer-events none', 'reduced-motion rule present'], sourceInspectionOnly: ['save effect follows fulfilled flush + mutate(commit)', 'capture guide outside camera video'], notVerified: ['actual browser 390/1440 overflow and 44px tap targets', 'runtime animation timing and reduced-motion playback', 'real click save failure/success and reopen App hook'], illustrationOnly: 'contact-sheet.svg, not an app screenshot' }, null, 2) + '\n');
console.log('PASS synthetic SSR + source invariants; illustration-only contact-sheet.svg written. Browser checks NOT performed.');
