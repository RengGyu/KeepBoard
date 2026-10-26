// Render real React components without a browser. This does not exercise effects or clicks.
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { rummikubPack } from '../../gamepacks/rummikub.ts';
import { createRummikubTile, emptyRummikub, normalizeRummikubDetailed, rummikubAnswers } from '../../shared/rummikub.ts';
import type { AIStatus, SessionView, Value } from '../../shared/types.ts';

globalThis.window = { addEventListener() {} } as unknown as Window & typeof globalThis;
globalThis.fetch = async () => { throw new Error('Network forbidden during synthetic SSR'); };
const { default: Workspace, rummikubReadoutMessage } = await import('../../src/SessionWorkspace.tsx');
const table = emptyRummikub(), rack = emptyRummikub('red');
table.groups = [{ id: 'g', label: '합성 묶음', tiles: [1, 7, 13].map(number => ({ ...createRummikubTile(`tile-${number}`), kind: 'number', color: 'blue', number })) }];
rack.loose = [{ ...createRummikubTile('private-13'), kind: 'number', color: 'black', number: 13 }];
const view: SessionView = {
  pack: rummikubPack,
  session: { id: 'synthetic-rummikub-ui', name: '합성 루미큐브', example: false, createdAt: 'now', updatedAt: 'now', gamePackId: 'rummikub', gamePackVersion: rummikubPack.version, captureEpoch: 'epoch', turnInstanceId: 'turn', stage: 'capture', players: [{ id: 'red', name: '빨강', color: '#c2232f' }], evidence: [], assertions: [
    { id: 'table', field: 'table.scene', value: table as unknown as Value, basis: 'user', status: 'accepted', evidenceIds: [], updatedAt: 'now' },
    { id: 'rack', field: 'rack.scene', ownerId: 'red', value: rack as unknown as Value, basis: 'user', status: 'accepted', evidenceIds: [], updatedAt: 'now' },
  ], preservations: [], snapshots: [], notes: {}, activity: [] },
  questions: [], derived: [], briefing: [], ready: true, progress: { resolved: 0, total: 0 }, differences: [],
};
let status: AIStatus | null = null;
function render(ownerId?: string) { return renderToStaticMarkup(createElement(Workspace, { view, ownerId, busy: false, status, mutate: async () => {}, onBack() {}, onNewBoard() {}, setOwnerId: async () => {}, onToast() {} })); }
view.session.analysisSummary = '여러 장면의 판독을 보류했습니다.';
view.session.analysisSummaryOwnerId = null;
const publicHtml = render();
assert.match(publicHtml, /여러 장면의 판독을 보류했습니다/);
assert.match(publicHtml, /루미큐브 공용 묶음/);
assert.match(publicHtml, /사진 자동 인식이 연결되지 않았어요/);
assert.match(publicHtml, /aria-label="새 보드 만들기"/);
for (const number of [1, 7, 13]) assert.match(publicHtml, new RegExp(`파랑 ${number},`));
assert.doesNotMatch(publicHtml, /검정 13,|어디까지 했나요|카탄/);
const privateHtml = render('red');
assert.doesNotMatch(privateHtml, /여러 장면의 판독을 보류했습니다/);
assert.match(privateHtml, /내 루미큐브 받침대/);
assert.match(privateHtml, /검정 13,/);
assert.match(privateHtml, /받침대 스캔/);
assert.doesNotMatch(privateHtml, /파랑 7,|손패 스캔/);
table.groups[0].tiles[0].face = 'unknown';
table.groups[0].tiles[1].kind = 'unknown';
view.session.assertions[0].value = table as unknown as Value;
const unknownHtml = render();
assert.doesNotMatch(unknownHtml, /파랑 1,|파랑 7,/, 'unknown face/type must not present retained face values as confirmed tiles');
assert.match(unknownHtml, /파랑 13,/);
view.privacy = { protectedOwnerIds: ['red'], unlockedOwnerIds: [] };
const lockedHtml = render('red');
assert.doesNotMatch(lockedHtml, /내 루미큐브 받침대|검정 13,/);
assert.match(lockedHtml, /비밀번호/);
status = { configured: true, provider: 'gateway', model: 'synthetic' };
view.session.evidence = [{ id: 'photo', scope: 'public', kind: 'photo', url: '/synthetic.jpg', capturedAt: 'now', captureEpoch: 'epoch', label: '' }];
const connectedHtml = render();
assert.match(connectedHtml, /사진 읽기/);
assert.doesNotMatch(connectedHtml, /사진 자동 인식이 연결되지 않았어요/);
assert.doesNotMatch(render('red'), /사진 읽기/);
assert.match(connectedHtml, /사진을 추가하면 자동으로 읽어 타일 후보/);
assert.match(rummikubReadoutMessage('manual'), /사진만 보관/);
assert.match(rummikubReadoutMessage('failed'), /실패/);
assert.match(rummikubReadoutMessage('analyzing'), /읽고 있어요/);
assert.match(rummikubReadoutMessage('done', 0), /새 타일 후보가 없어요/);
assert.match(rummikubReadoutMessage('done', 1), /타일 후보/);
assert.match(rummikubReadoutMessage('done', 1, true), /받침대/);

// Exercise current green support with synthetic candidates, never the user's saved scene.
const green = emptyRummikub();
green.groups = [{ id: 'synthetic-green', label: '합성 초록 묶음', tiles: [createRummikubTile('green-7', { color: 'green', number: 7, evidenceIds: ['photo'] })] }];
view.session.assertions = [{ id: 'green-candidate', field: 'table.scene', value: green as unknown as Value, basis: 'observation', status: 'candidate', evidenceIds: ['photo'], updatedAt: 'now' }];
const greenHtml = render();
assert.match(greenHtml, /사진에서 읽은 후보예요/);
assert.match(greenHtml, /초록 7,/);
assert.match(greenHtml, /class="rt-face-number" style="color:#36864b"/);
const normalized = normalizeRummikubDetailed(green, { evidenceIds: ['photo'] });
assert.equal(normalized.recognized, true);
assert.equal(normalized.scene.groups[0].tiles[0].color, 'green');
assert.deepEqual(rummikubAnswers(normalized.scene)[0].value, green);
console.log('PASS: public/rack/PIN SSR, connected/manual/failure/no-candidate messages, green candidate markup and normalization→save payload. No network/user records. Effects, browser images/layout and clicks NOT checked.');
