// Usage: node docs/cloud-ui-review-20261026/review-walk.cjs (with Playwright on NODE_PATH) after starting review-server.mts and saving its first output line to review-server.log.
// Synthetic browser walk on the isolated review server (no real AI, no production data).
const {chromium}=require('playwright');
const fs=require('fs');
const s=JSON.parse(fs.readFileSync(process.env.REVIEW_SERVER_LOG||'review-server.log','utf8').split('\n').find(l=>l.startsWith('{"root"')));
const results=[];const ok=(name,cond,detail='')=>{results.push({name,pass:!!cond,detail});console.log((cond?'PASS ':'FAIL ')+name+(detail?' — '+detail:''));};
const api=async(p,id)=>p.evaluate(async([b,id])=>(await (await fetch(b+'/api/sessions/'+id)).json()),[s.base,id]);
const accepted=(v,field,owner)=>v.session.assertions.filter(a=>a.field===field&&(a.ownerId??null)===(owner??null)&&a.status==='accepted').at(-1)?.value;
(async()=>{
 const b=await chromium.launch();
 // Generic (Azul) on desktop: in-place quantity, undo, add, save, edit after save, restore saved, reload.
 {const p=await b.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>ok('no page error (azul)',false,e.message));
  await p.goto(`${s.base}/?session=${s.azul}`,{waitUntil:'networkidle'});await p.waitForTimeout(800);
  await p.getByRole('button',{name:/^공장 1, /}).click();await p.waitForTimeout(300);
  ok('selecting a piece opens the inline editor beside it',await p.locator('.gb-inline-editor').isVisible());
  const q=p.locator('.gb-qty output');const q0=await q.textContent();
  await p.getByRole('button',{name:'수량 늘리기'}).click();const q1=await q.textContent();
  ok('one tap raises the quantity',Number(q1)===Number(q0)+1,`${q0}→${q1}`);
  await p.getByRole('button',{name:'배치 되돌리기'}).click();await p.waitForTimeout(200);
  ok('undo cancels the change',await q.textContent()===q0,`now ${await q.textContent()}`);
  await p.getByRole('button',{name:'수량 늘리기'}).click();
  const before=(await p.locator('.generic-components').first().locator('.gb-piece').count());
  await p.getByRole('button',{name:'구성물 추가'}).click();await p.waitForTimeout(300);
  await p.locator('.gb-inline-editor select').first().selectOption({label:'색 타일'});
  await p.locator('.gb-inline-editor input[type=number]').first().fill('2');
  await p.getByRole('button',{name:'완료'}).click();
  ok('add creates a new piece in two taps plus its values',(await p.locator('.generic-components').first().locator('.gb-piece').count())===before+1);
  await p.getByRole('button',{name:'저장'}).first().click();await p.waitForTimeout(1500);
  let v=await api(p,s.azul);let offer=accepted(v,'offer.scene');
  ok('save writes the record and a snapshot',offer.pieces.length===5&&offer.pieces.find(x=>x.label==='공장 1').quantity===Number(q0)+1&&v.session.snapshots.length>=2,`pieces ${offer.pieces.length}, snapshots ${v.session.snapshots.length}`);
  await p.getByRole('button',{name:/^공장 1, /}).click();await p.getByRole('button',{name:'수량 늘리기'}).click();
  await p.getByRole('button',{name:'구성물 기록'}).click();await p.waitForTimeout(800);
  v=await api(p,s.azul);ok('an edit after saving is recorded without a new snapshot',accepted(v,'offer.scene').pieces.find(x=>x.label==='공장 1').quantity===Number(q0)+2);
  await p.locator('summary',{hasText:'저장 기록 복원'}).click();await p.getByRole('button',{name:'공개 저장 기록 복원'}).click();await p.waitForTimeout(1200);
  v=await api(p,s.azul);ok('restoring the saved public record brings the snapshot back',accepted(v,'offer.scene').pieces.find(x=>x.label==='공장 1').quantity===Number(q0)+1);
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
  ok('reload shows the restored record',(await p.locator('.generic-components').first().locator('.gb-piece').count())===5&&/공장 1, 5개/.test(await p.locator('.generic-components').first().locator('.gb-piece').first().getAttribute('aria-label')),await p.locator('.generic-components').first().locator('.gb-piece').first().getAttribute('aria-label'));
  await p.close();}
 // Catan personal tab: count edit, apply, save, reload; an unapplied draft survives an owner switch.
 {const p=await b.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>ok('no page error (catan)',false,e.message));
  await p.goto(`${s.base}/?session=${s.catan}&player=${s.catanPlayer}`,{waitUntil:'networkidle'});await p.waitForTimeout(800);
  ok('private zone is marked on the personal tab',await p.locator('.correction-workspace.is-private .cw-private-note').isVisible());
  const wood=p.getByLabel('자원 카드 · 목재');await wood.fill('5');await p.getByRole('button',{name:'반영'}).first().click();await p.waitForTimeout(800);
  await p.getByRole('button',{name:'저장'}).first().click();await p.waitForTimeout(1200);
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
  ok('a saved personal count reopens',await p.getByLabel('자원 카드 · 목재').inputValue()==='5');
  await p.getByLabel('자원 카드 · 벽돌').fill('2');
  await p.getByRole('tab',{name:/공용 보드/}).click();await p.waitForTimeout(1200);
  ok('switching to the shared board hides personal counts',await p.getByLabel('자원 카드 · 벽돌').count()===0);
  await p.getByRole('tab',{name:/플레이어 1/}).click();await p.waitForTimeout(1200);
  ok('the unapplied draft was kept through the owner switch',await p.getByLabel('자원 카드 · 벽돌').inputValue()==='2');
  await p.close();}
 // Mobile generic: tapping a piece opens the sheet editor; closing it leaves the record unchanged.
 {const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto(`${s.base}/?session=${s.azul}`,{waitUntil:'networkidle'});await p.waitForTimeout(800);
  const v0=accepted(await api(p,s.azul),'offer.scene');
  await p.getByRole('button',{name:/^공장 2, /}).click();await p.waitForTimeout(400);
  ok('phone: a tapped piece opens the editor sheet',await p.locator('.modal .gb-editor').isVisible());
  await p.getByRole('button',{name:'완료'}).click();await p.waitForTimeout(300);
  ok('phone: closing without edits changes nothing',JSON.stringify(accepted(await api(p,s.azul),'offer.scene'))===JSON.stringify(v0));
  ok('phone: no horizontal page scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await p.close();}
 await b.close();
 fs.writeFileSync(process.env.REVIEW_RESULTS||'review-walk-results.json',JSON.stringify(results,null,1));
 console.log(results.filter(r=>r.pass).length+'/'+results.length+' passed');
})();
