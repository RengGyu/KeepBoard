/* Standalone synthetic interaction study; no API, camera, AI or product Store. */
const $ = selector => document.querySelector(selector);
const root = $('#app');
const storageKey = 'keepboard.game-info-study.v1';
const players = [
  {id:'red',name:'지민',color:'#c2232f',score:4},
  {id:'blue',name:'서준',color:'#2867b2',score:3},
  {id:'gold',name:'하린',color:'#e39a14',score:3},
  {id:'green',name:'도윤',color:'#158f74',score:2}
];
const names={settlement:'마을',city:'도시',road:'도로'};
const resources=[['lumber','목재'],['brick','벽돌'],['wool','양모'],['grain','곡물'],['ore','광석']];
const slots=[
 {x:253.397,y:210},{x:253.397,y:260},{x:513.205,y:260},{x:166.795,y:410},
 {x:469.904,y:435},{x:253.397,y:510},{x:340,y:360},{x:426.603,y:210},
 {x:166.795,y:260},{x:340,y:160},{x:426.603,y:360},{x:340,y:460}
];
const roadSlots=[{x:275.048,y:197.5,rotation:150},{x:383.301,y:160,rotation:90},{x:231.747,y:272.5,rotation:150},{x:361.651,y:272.5,rotation:-150},{x:448.253,y:272.5,rotation:-150},{x:275.048,y:347.5,rotation:150},{x:166.795,y:385,rotation:-90},{x:296.699,y:460,rotation:90},{x:340,y:185,rotation:90}];
const pieces=[
 {id:'s1',kind:'settlement',owner:'red',...slots[0]},
 {id:'s2',kind:'settlement',owner:'blue',...slots[1]},
 {id:'s3',kind:'settlement',owner:'blue',...slots[2]},
 {id:'s4',kind:'city',owner:'red',...slots[3]},
 {id:'s5',kind:'settlement',owner:'gold',...slots[4]},
 {id:'s6',kind:'city',owner:'green',...slots[5]},
 ...roadSlots.slice(0,8).map((s,i)=>({id:'r'+i,kind:'road',owner:['red','gold','blue','green','blue','red','red','green'][i],...s}))
];
const clone=value=>JSON.parse(JSON.stringify(value));
const baseRecords=[
 {id:'saturday',name:'토요일 카탄',date:'10월 19일 저장',turn:'red',phase:'건설 중',note:'서준이 도로 놓을 자리만 한 번 더 확인하기.',pieces:clone(pieces),hands:{red:[3,1,1,1,1],blue:[1,2,0,2,0],gold:[1,1,1,0,3],green:[0,1,2,1,0]},notes:{red:'다음에는 목재가 필요해요.'}},
 {id:'weekend',name:'지난주 모임',date:'10월 12일 저장',turn:'blue',phase:'자원 교환 중',note:'각자 손패는 그대로 두고 다음 모임에 이어하기.',pieces:clone(pieces).map((p,i)=>({...p,owner:i%2===0?'gold':p.owner})),hands:{red:[2,0,1,1,0],blue:[1,3,0,0,1]},notes:{}}
];
let records=clone(baseRecords);
try{const stored=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(stored)&&stored.length&&stored.every(r=>r&&typeof r.id==='string'&&Array.isArray(r.pieces)&&r.pieces.every(p=>names[p.kind]&&players.some(o=>o.id===p.owner)&&Number.isFinite(p.x)&&Number.isFinite(p.y))))records=stored;}catch{/* A fresh fixture stays available when storage is unavailable. */}
let chosen=records[0].id,active=null,selected=null,mode='inspect',addKind=null,tab='public',personalOwner='red',history=[],toastTimer;
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const owner=id=>players.find(p=>p.id===id)||players[0];
const phaseKey=phase=>/교환/.test(phase)?'trade':/건설/.test(phase)?'build':'other';
const avatar=id=>`<i class="player-avatar" style="--owner:${owner(id).color}" aria-hidden="true">${owner(id).name.slice(0,1)}</i>`;
const dot=id=>`<i class="owner-dot" style="--owner:${owner(id).color}" aria-hidden="true"></i>`;
const art=(kind,color='red')=>`assets/${kind}-${color}.svg`;
const board=(data,interactive=false)=>`<div class="board" ${interactive?'aria-label="카탄 공용 예시 보드"':''}><img class="board-base" src="assets/catan-base.svg" alt="육지 19칸, 숫자 토큰, 항구와 도둑을 담은 합성 카탄 보드">${data.pieces.map(piece=>`<${interactive?'button':'span'} class="piece ${interactive?'':'piece-static'} ${selected===piece.id&&interactive?'selected':''}" data-kind="${piece.kind}" ${interactive?`data-piece="${piece.id}" aria-label="${owner(piece.owner).name} ${names[piece.kind]} ${piece.id}" aria-pressed="${selected===piece.id}"`:''} style="--x:${piece.x/680*100}%;--y:${piece.y/620*100}%;--rotation:${piece.rotation||0}deg"><img src="${art(piece.kind,piece.owner)}" alt="${interactive?'':owner(piece.owner).name+' '+names[piece.kind]}"></${interactive?'button':'span'}>`).join('')}${interactive&&mode==='place'?placementSlots().map((slot,index)=>`<button class="place-slot" aria-label="${names[addKind||active.pieces.find(p=>p.id===selected)?.kind]||'말'} 자리 ${index+1}에 놓기" data-slot="${index}" style="left:${slot.x/680*100}%;top:${slot.y/620*100}%">+</button>`).join(''):''}</div>`;
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2000);}
function setRoute(route){location.hash=route;}
function renderLibrary(){
 active=null;selected=null;mode='inspect';
 const preview=records.find(r=>r.id===chosen)||records[0];
 root.innerHTML=`<div class="library screen-enter"><p class="section-label">내 게임</p><section class="game-overview" aria-label="카탄 게임 정보"><div class="game-copy"><p class="edition">KLAUS TEUBER · BASE GAME</p><h1>CATAN</h1><h2>카탄 · 기본판</h2><p>자원을 교환하고,<br>섬에 도로와 마을을 세우는 게임.</p><div class="game-meta"><div class="meta-chip meta-people"><span>플레이 인원</span><strong>3–4명</strong></div><div class="meta-chip meta-time"><span>플레이 시간</span><strong>60–90분</strong></div><div class="meta-chip meta-age"><span>권장 연령</span><strong>10세 이상</strong></div></div><div class="info-links"><a class="hero-link" href="https://www.catan.com/catan" target="_blank" rel="noreferrer">공식 게임 정보<span class="game-link-arrow">↗</span></a></div></div><div class="game-art">${board(preview)}<span class="game-art-caption">선택한 판 · ${escapeHTML(preview.name)} · 합성 예시</span></div></section><section class="saved-section" id="saved"><div class="section-heading"><h2>저장한 판<span>${records.length}</span></h2><button class="secondary" data-action="new"><span class="plus">+</span>새 판 기록</button></div><div class="saved-list">${records.map(record=>`<article class="saved-row ${chosen===record.id?'selected':''}"><button class="preview-pick" data-preview="${record.id}" aria-label="${escapeHTML(record.name)} 미리보기" aria-pressed="${chosen===record.id}"><div class="row-image">${board(record)}</div><div class="row-info"><h3>${escapeHTML(record.name)}</h3><p>${escapeHTML(record.date)}</p><span class="row-tags"><span class="turn-tag" style="--owner:${owner(record.turn).color}">${owner(record.turn).name} 차례</span><span class="phase-tag phase-${phaseKey(record.phase)}">${escapeHTML(record.phase)}</span></span></div></button><div class="row-members">${players.map(p=>dot(p.id)).join('')}<span>4명</span></div><button class="row-resume" data-open="${record.id}">이어보기<span aria-hidden="true">→</span></button></article>`).join('')}</div><p class="selected-caption"><strong>${escapeHTML(preview.name)} 미리보는 중</strong><span>저장한 모습 그대로 열어요.</span></p></section><p class="library-foot">보드 그림과 플레이 기록은 UI 확인용 합성 예시입니다.</p></div>`;
 document.title='KeepBoard · 카탄과 저장한 판';window.scrollTo({top:0});
}
function startBoard(id){const record=records.find(r=>r.id===id)||records[0];chosen=record.id;active=clone(record);selected=null;history=[];tab='public';mode='inspect';addKind=null;personalOwner=record.turn;setRoute('board');renderWorkspace();window.scrollTo({top:0});}
function contextPanel(){return `<div class="record-summary"><h2>이 판의 기록</h2><dl><dt>현재 차례</dt><dd class="turn-name">${dot(active.turn)}${owner(active.turn).name}</dd><dt>중단 지점</dt><dd>${escapeHTML(active.phase)}</dd><dt>참여 인원</dt><dd>4명 · 합성 예시</dd></dl><p class="record-note"><span>공용 메모</span>${escapeHTML(active.note)}</p></div><div class="record-status"><span></span>${escapeHTML(active.date)}</div>`;}
function privatePanel(){
 const values=active.hands?.[personalOwner]||[0,0,0,0,0];
 return `<div class="inspector-head">${dot(personalOwner)}<div><p>개인 기록 · 합성 예시</p><h2>${owner(personalOwner).name}의 보유 카드</h2></div></div><div class="inspector-content"><p class="private-heading">개인 카드는 공용 보드와 따로 기록해요.</p><div class="private-resources">${resources.map(([key,label],i)=>`<label><img src="assets/card-${key}.svg" alt="${label} 자원 카드"><span>${label}</span><input type="number" min="0" max="99" step="1" inputmode="numeric" aria-label="${owner(personalOwner).name} ${label} 수량" value="${values[i]??0}" data-resource="${i}"></label>`).join('')}</div><label class="private-note">개인 메모<textarea data-note rows="2" placeholder="다음에 필요한 카드 등">${escapeHTML(active.notes?.[personalOwner]||'')}</textarea></label></div>`;
}
function inspector(){
 if(tab==='private')return privatePanel();
 if(mode==='add')return `<div class="inspector-head"><div><p>공용 보드</p><h2>부품 추가</h2></div><button data-action="cancel" aria-label="추가 닫기">×</button></div><div class="inspector-content"><div class="palette">${Object.entries(names).map(([kind,label])=>`<button data-add="${kind}"><img src="${art(kind,personalOwner)}" alt=""><span>${label}</span></button>`).join('')}</div><p class="inspector-note">부품을 고르고 보드의 자리를 누르세요.</p></div>`;
 const piece=active.pieces.find(p=>p.id===selected);
 if(!piece)return contextPanel();
 return `<div class="inspector-head"><img src="${art(piece.kind,piece.owner)}" alt="선택한 ${names[piece.kind]}"><div><p>공용 보드 · 선택한 말</p><h2>${names[piece.kind]}</h2></div><button data-action="cancel" aria-label="선택 해제">×</button></div><div class="inspector-content"><h3>소유 플레이어</h3><div class="owner-choices">${players.map(player=>`<button class="owner-choice" data-owner="${player.id}" aria-label="소유자 ${player.name}" aria-pressed="${piece.owner===player.id}">${dot(player.id)}<span>${player.name}</span></button>`).join('')}</div><button class="secondary" data-action="move">${mode==='place'?'이동 취소':'다른 자리로 이동'}<span aria-hidden="true">↗</span></button><p class="inspector-note">원본에서 확인한 말의 색과 위치를 고쳐요.</p></div>`;
}
function renderWorkspace(){
 if(!active){startBoard(chosen);return;}
 root.innerHTML=`<div class="workspace"><div class="workspace-heading"><div class="workspace-title"><button class="back" data-action="back" aria-label="게임 정보로 돌아가기">‹</button><div class="board-title"><p class="section-label">CATAN · 기본판</p><h1>${escapeHTML(active.name)}</h1></div></div><button class="primary save-button" data-action="save"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13l4 4v14H3V3Zm3 0v7h10V3M7 21v-7h10v7"/></svg>저장</button></div><div class="player-strip" aria-label="플레이어와 현재 차례">${players.map(p=>`<button class="player ${p.id===active.turn?'current':''}" data-player="${p.id}" aria-label="${p.name} 개인 기록${p.id===active.turn?' · 현재 차례':''}" style="--owner:${p.color}">${avatar(p.id)}<span>${p.name}<small>${p.id===active.turn?'지금 차례':'플레이어'}</small></span><b>${p.score}<em>점</em></b></button>`).join('')}</div><div class="board-layout"><section class="board-column" aria-label="게임판 이어보기"><div class="board-tabs" role="tablist"><button role="tab" aria-selected="${tab==='public'}" data-tab="public">공용 보드</button><button role="tab" aria-selected="${tab==='private'}" data-tab="private">개인 기록</button><span class="tab-note">${tab==='public'?'말을 눌러 고치기':owner(personalOwner).name+'의 카드와 메모'}</span></div><div class="canvas ${mode==='place'?'is-moving':''}"><div class="canvas-top"><span>TABLE 01 / CATAN</span><button data-action="undo" aria-label="되돌리기" ${!history.length?'disabled':''}>↶</button></div>${board(active,true)}${mode==='place'?`<div class="canvas-hint">${names[addKind||active.pieces.find(p=>p.id===selected)?.kind]}을 놓을 자리를 눌러 주세요.</div>`:''}</div><div class="canvas-caption"><span>공용 판 1개 · 지형 / 숫자 / 말 / 항구</span><span>합성 예시</span></div><div class="workspace-actions"><button class="secondary" data-action="add"><span class="plus">+</span>부품 추가</button><button class="secondary" data-action="info">게임 정보<span aria-hidden="true">↗</span></button></div></section><aside class="inspector ${tab==='public'&&(selected||mode==='add')?'tool-open':''}" aria-label="선택한 대상 도구">${inspector()}</aside></div></div>`;
 document.title=`${active.name} · KeepBoard`;
}
function placementSlots(){const kind=addKind||active?.pieces.find(p=>p.id===selected)?.kind;return kind==='road'?roadSlots:slots;}
function snapshot(){history.push(clone(active));if(history.length>20)history.shift();}
function place(index){
 const slot=placementSlots()[index];if(!slot)return;
 const piece=active.pieces.find(p=>p.id===selected),kind=addKind||piece?.kind;
 const occupants=active.pieces.filter(p=>p.id!==selected&&(kind==='road'?p.kind==='road':p.kind!=='road')&&Math.abs(p.x-slot.x)<1&&Math.abs(p.y-slot.y)<1);
 if(occupants.length>1){toast('이 자리는 먼저 확인해 주세요.');return;}
 if(occupants.length&&addKind){toast('이미 말이 있어요. 다른 자리를 눌러 주세요.');return;}
 if(piece&&Math.abs(piece.x-slot.x)<1&&Math.abs(piece.y-slot.y)<1){mode='inspect';renderWorkspace();return;}
 snapshot();
 if(piece){if(occupants[0])Object.assign(occupants[0],{x:piece.x,y:piece.y,rotation:piece.rotation||0});Object.assign(piece,slot);}
 else{const added={id:'added-'+Date.now(),kind:addKind,owner:personalOwner,...slot};active.pieces.push(added);selected=added.id;}
 addKind=null;mode='inspect';renderWorkspace();toast(occupants.length?'두 말의 자리를 바꿨어요.':'보드에 반영했어요.');
}
root.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.preview){chosen=button.dataset.preview;renderLibrary();return;}
 if(button.dataset.open){startBoard(button.dataset.open);return;}
 if(button.dataset.player){personalOwner=button.dataset.player;tab='private';mode='inspect';selected=null;renderWorkspace();return;}
 if(button.dataset.tab){tab=button.dataset.tab;mode='inspect';selected=null;renderWorkspace();return;}
 if(button.dataset.piece){selected=button.dataset.piece;mode='inspect';addKind=null;tab='public';renderWorkspace();return;}
 if(button.dataset.owner){const piece=active.pieces.find(p=>p.id===selected);if(piece&&piece.owner!==button.dataset.owner){snapshot();piece.owner=button.dataset.owner;personalOwner=piece.owner;renderWorkspace();toast(`${owner(piece.owner).name}의 말로 바꿨어요.`);}return;}
 if(button.dataset.add){addKind=button.dataset.add;selected=null;mode='place';renderWorkspace();return;}
 if(button.dataset.slot!==undefined){place(Number(button.dataset.slot));return;}
 switch(button.dataset.action){
  case'new':{const fresh=clone(baseRecords[0]);fresh.id='new-'+Date.now();fresh.name='새로운 카탄';fresh.date='아직 저장하지 않음';records.unshift(fresh);startBoard(fresh.id);toast('합성 예시 판을 새로 열었어요.');break;}
  case'back':case'info':setRoute('library');renderLibrary();break;
  case'cancel':mode='inspect';selected=null;addKind=null;renderWorkspace();break;
  case'add':mode='add';tab='public';selected=null;renderWorkspace();break;
  case'move':mode=mode==='place'?'inspect':'place';addKind=null;renderWorkspace();break;
  case'undo':if(history.length){active=history.pop();selected=null;mode='inspect';addKind=null;renderWorkspace();toast('직전 변경을 되돌렸어요.');}break;
  case'save':{
   if(tab==='private'){active.hands??={};active.hands[personalOwner]??=[0,0,0,0,0];for(const input of root.querySelectorAll('[data-resource]')){const value=Number(input.value);if(Number.isInteger(value)&&value>=0&&value<=99)active.hands[personalOwner][Number(input.dataset.resource)]=value;}const note=root.querySelector('[data-note]');if(note){active.notes??={};active.notes[personalOwner]=note.value;}}
   active.date='방금 저장';const index=records.findIndex(r=>r.id===active.id);records[index]=clone(active);
   try{localStorage.setItem(storageKey,JSON.stringify(records));renderWorkspace();toast('이 브라우저에 판을 저장했어요.');}catch{toast('브라우저 저장 공간을 확인해 주세요.');}break;
  }
 }
});
root.addEventListener('input',event=>{
 if(event.target.matches('[data-resource]')){const number=Number(event.target.value);if(!Number.isInteger(number)||number<0||number>99){event.target.value='0';return;}snapshot();active.hands??={};active.hands[personalOwner]??=[0,0,0,0,0];active.hands[personalOwner][Number(event.target.dataset.resource)]=number;}
 if(event.target.matches('[data-note]')){snapshot();active.notes??={};active.notes[personalOwner]=event.target.value;}
});
window.addEventListener('hashchange',()=>{if(location.hash==='#board'){if(!active)startBoard(chosen);else renderWorkspace();}else{renderLibrary();if(location.hash==='#saved')$('#saved').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}});
if(location.hash==='#board')startBoard(chosen);else renderLibrary();
