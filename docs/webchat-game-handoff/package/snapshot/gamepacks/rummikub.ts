import type {GamePack} from '../shared/types.ts';

/** Classic recording profile, deliberately independent of the Catan scene/topology contract. */
export const legacyRummikubPack:GamePack={
 id:'rummikub',version:'1.0.0',title:'루미큐브',edition:'Classic 기본 세트',
 description:'공용 묶음과 타일 순서, 각자의 받침대를 사진과 함께 기록합니다. 재배열 중인 판과 모르는 타일도 그대로 저장합니다. 사진의 초록 인쇄색도 그대로 구분합니다.',
 sources:[{id:'rummikub-classic',title:'Rummikub Classic 공식 규칙',url:'https://rummikub.com/wp-content/uploads/2019/12/2600-English.pdf',section:'기존 연구명세의 Classic 기본 세트·묶음/런·최초 등록·조커. 인쇄별 상세 차이는 별도 확인.'}],
 fields:[
  {key:'table.scene',label:'공용 묶음',description:'각 타일의 개별 ID·색·1~13/조커·묶음 안 순서와 따로 놓은 타일을 기록합니다.',scope:'public',visibility:'public',type:'json',acquisition:'observe',group:'table',lifetime:'session'},
  {key:'rack.scene',label:'내 받침대',description:'내 타일의 실제 줄 순서와 중복 사본을 따로 보존합니다. 가려진 값은 모름으로 둡니다.',scope:'player',visibility:'owner',type:'json',acquisition:'observe',group:'rack',lifetime:'session'},
  {key:'currentPlayer',label:'누구 차례인가요?',description:'사진으로 추측하지 않고 알고 있는 차례만 선택합니다.',scope:'public',visibility:'public',type:'text',acquisition:'ask',group:'context',lifetime:'session',ui:{level:'primary',order:1,editor:'player'}},
  {key:'opened',label:'최초 등록을 했나요?',description:'기존 묶음만으로 과거 등록 여부를 추측하지 않습니다.',scope:'player',visibility:'public',type:'boolean',acquisition:'ask',group:'context',lifetime:'session',ui:{level:'detail',order:2}},
  {key:'pending',label:'재배열 중단 메모',description:'아직 정리 중인 묶음·조커·남은 행동을 선택적으로 기록합니다. 열기만으로 턴이나 제한시간이 진행되지 않습니다.',scope:'public',visibility:'public',type:'text',acquisition:'ask',group:'context',lifetime:'session',ui:{level:'detail',order:3}},
 ],
 requirements:[],derivedRules:[],preservationTemplates:[],
 supportGaps:['Classic만 지원하며 Twist/Xpress 특수 타일·별도 규칙은 포함하지 않습니다.','묶음의 합법성·최초 등록 점수·조커 회수·시간제한·패널티·점수·자동 턴 진행은 판정하지 않습니다.','미공개 공급의 정체·가려진 받침대·중복 사진 속 동일 실물을 추측하지 않습니다. 미확인 값은 그대로 저장합니다.'],
};
export const rummikubPack:GamePack={...structuredClone(legacyRummikubPack),version:'1.1.0',description:'Classic의 빨강·파랑·검정·주황 네 색과 묶음/받침대 순서를 기록합니다. 불명확한 색은 모름으로 두며 과거 미지원 색 기록은 원본으로 보존합니다.',sources:[{id:'rummikub-classic',title:'Rummikub Classic 공식 규칙 · 2025',url:'https://rummikub.com/wp-content/uploads/2025/06/4600-0236-0013-EN-_rummikub-Classic.pdf',section:'Classic 106타일 기본세트의 네 색. XP/Mini XP·Large Numbers를 같은 판본으로 취급하지 않는다.'}]};
export default rummikubPack;
