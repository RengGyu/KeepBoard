import type {Evidence} from '../../shared/types.ts';
import {RUMMIKUB_COLORS,RUMMIKUB_VERSION,rummikubField} from '../../shared/rummikub.ts';

const nullableNumber={anyOf:[{type:'integer',minimum:1,maximum:13},{type:'null'}]};
const nullableColor={enum:[...RUMMIKUB_COLORS,null]};
const region={anyOf:[{type:'object',properties:{x:{type:'number',minimum:0,maximum:1},y:{type:'number',minimum:0,maximum:1},width:{type:'number',exclusiveMinimum:0,maximum:1},height:{type:'number',exclusiveMinimum:0,maximum:1}},required:['x','y','width','height'],additionalProperties:false},{type:'null'}]};
const tile={type:'object',properties:{id:{type:'string'},kind:{enum:['number','joker','unknown']},color:nullableColor,number:nullableNumber,face:{enum:['front','back','unknown']},representedColor:nullableColor,representedNumber:nullableNumber,evidenceIds:{type:'array',items:{type:'string'}},region,note:{type:'string'}},required:['id','kind','color','number','face','representedColor','representedNumber','evidenceIds','region','note'],additionalProperties:false};
export const rummikubSceneSchema={type:'object',properties:{version:{const:RUMMIKUB_VERSION},ownerId:{anyOf:[{type:'string'},{type:'null'}]},coverage:{enum:['full','partial','unknown']},groups:{type:'array',items:{type:'object',properties:{id:{type:'string'},label:{type:'string'},tiles:{type:'array',items:tile}},required:['id','label','tiles'],additionalProperties:false}},loose:{type:'array',items:tile}},required:['version','ownerId','coverage','groups','loose'],additionalProperties:false};
export function rummikubResponseSchema(ownerId?:string){return {type:'object',properties:{assertions:{type:'array',maxItems:1,items:{type:'object',properties:{field:{const:rummikubField(ownerId)},ownerId:{const:ownerId??null},value:rummikubSceneSchema,evidenceIds:{type:'array',items:{type:'string'}},reason:{type:'string'}},required:['field','ownerId','value','evidenceIds','reason'],additionalProperties:false}},summary:{type:'string'},warnings:{type:'array',items:{type:'string'}}},required:['assertions','summary','warnings'],additionalProperties:false};}
export interface RummikubPromptInput {evidence:readonly Pick<Evidence,'id'|'ownerId'|'scope'|'label'>[];ownerId?:string;instruction?:string}
export function rummikubObservationPrompt({evidence,ownerId,instruction}:RummikubPromptInput){
 const authorized=evidence.filter(e=>ownerId?e.scope==='player'&&e.ownerId===ownerId:e.scope==='public'&&!e.ownerId);
 return `루미큐브 Classic의 관측 기록만 JSON으로 답하세요. 게임 행동이나 규칙 판정이 아닙니다.
대상 필드: ${rummikubField(ownerId)}. 소유 영역 ownerId=${JSON.stringify(ownerId??null)}. 선택 판본은 Classic 네 색(빨강 red/파랑 blue/검정 black/주황 orange)입니다. 타일 인쇄색은 플레이어 소유색이 아니며 소유자를 색으로 추정하지 마세요. 초록 등 목록 밖 색이나 판별이 불명확한 색은 null로 두고, orange 또는 다른 색으로 자동 치환하지 마세요. 다른 판본의 색을 Classic에 추가하지 마세요.
영역 구분: ${ownerId ? '개인 받침대 위 타일만 읽으세요. 공용 테이블 묶음은 이 개인 기록에 넣지 마세요.' : '공용 테이블에 평평하게 놓인 타일만 읽으세요. 사진에 앞면이 보여도 개인 받침대 위/안/옆에 세워진 타일은 전부 제외하세요. 받침대 줄을 공용 groups나 loose로 만들지 마세요. 상자·포장에 인쇄된 타일 그림과 주머니·공급은 제외하세요.'}
사진 ID: ${JSON.stringify(authorized.map(e=>e.id))}. 이 목록 밖 사진·다른 사람 받침대·공용 사진에서 숨은 개인 타일을 생성하지 마세요.
값은 전용 ${RUMMIKUB_VERSION}이며 Catan ComponentScene 형식이 아닙니다. 숫자 1부터 13까지 모두 허용(7 포함). 0은 숫자 타일이 아니며 모름은 null입니다. 조커는 kind:joker, 실제로 대신하는 색/숫자가 확인된 경우만 representedColor/representedNumber에 적으세요. 숨은 값·현재 차례·최초 등록 이력을 추측하지 마세요.
실물 타일 하나당 고유 id 하나. 동일 색·동일 숫자 두 사본을 합치지 마세요. quantity로 합산·타일 확장하지 마세요. groups 배열은 사진에서 구분 가능한 묶음 순서, 각 tiles 배열은 실제 왼쪽→오른쪽 순서입니다. 받침대는 실제 줄을 groups로 기록합니다. 묶음이 불명확하거나 재배열 중 따로 놓인 타일은 loose에 유지하며 자동 정렬·완성·누락값 채우기를 하지 마세요.
한 번의 응답에는 대상 영역의 scene assertion을 최대 한 개만 반환하세요. 모든 groups와 loose를 그 한 scene에 담으세요. 읽을 수 없으면 assertions는 빈 배열로 두세요.
같은 촬영의 여러 사진은 다른 턴이 아니라 같은 중단판의 여러 시점입니다. 확실히 같은 실물일 때만 한 타일로 통합하고 실제 근거 evidenceIds를 모두 참조하세요. 같은 삽화나 숫자라는 이유만으로 독립 타일을 합치지 마세요. 대응이 불확실하면 경고에 남기고 부분 관측으로 기록하세요. 부분 사진은 coverage:partial이며 전체 타일/받침대/공급 수량을 생성하지 마세요.
region은 evidenceIds[0] 사진 기준 0~1 좌표로 해당 타일을 감싸는 사각형입니다. 다른 사진의 crop을 가져오지 말고 모르면 null. 모든 원본은 보존됩니다. 사진 밖·뒤집힌 타일의 앞면은 추정하지 마세요. 사용자 확정 기록을 덮어쓰지 않으며 결과는 후보입니다.
사용자 관측 지시: ${JSON.stringify(instruction??'')}
출력 형식: ${JSON.stringify(rummikubResponseSchema(ownerId))}`;
}
export const rummikubPrompt=rummikubObservationPrompt;
