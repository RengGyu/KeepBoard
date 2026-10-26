import type { PlannedAction, Question, Session } from '../shared/types.ts';

export function planActions(session: Session, questions: Question[]): PlannedAction[] {
  const groups = new Map<string, PlannedAction>();
  for (const question of questions) {
    const owner = session.players.find(p => p.id === question.ownerId)?.name || '공용 판';
    const evidence = session.evidence.filter(e => e.ownerId === question.ownerId);
    const candidate = session.assertions.some(a => a.field === question.field && a.ownerId === question.ownerId && a.status !== 'accepted');
    const kind: PlannedAction['kind'] = candidate ? 'proposeAssertions'
      : question.acquisition === 'preserve' || (question.preservationId && !evidence.length) ? 'preparePack'
      : question.acquisition === 'ask' ? 'askFields'
      : evidence.length ? 'inspectEvidence' : 'requestView';
    const id = `${session.captureEpoch}:${question.ownerId || 'public'}:${kind}`;
    const labels: Record<PlannedAction['kind'], string> = {
      proposeAssertions: `${owner}의 상태 후보 확인`,
      preparePack: `${owner}의 실물 묶음 보관`,
      askFields: `${owner}의 진행 상태 확인`,
      inspectEvidence: `${owner}의 기존 원본에서 확인`,
      requestView: `${owner} 영역 촬영`,
      requestCommit: '현재 판 저장',
    };
    const descriptions: Record<PlannedAction['kind'], string> = {
      proposeAssertions: '읽어 둔 후보를 원본과 대조하면 다시 촬영하지 않아도 됩니다.',
      preparePack: '순서와 구분을 유지해 보관하면 내부를 모두 입력하지 않아도 됩니다.',
      askFields: '사진에 남지 않는 사실을 해당 플레이어에게 확인합니다.',
      inspectEvidence: '이미 확보한 사진을 먼저 사용합니다. 필요한 부분은 확대하거나 다시 분석할 수 있습니다.',
      requestView: '이 항목을 확인할 수 있는 원본을 확보합니다.',
      requestCommit: '원본과 기록을 저장본으로 묶습니다.',
    };
    const existing = groups.get(id);
    if (existing) {
      existing.fields.push(question.field);
      existing.priority = Math.max(existing.priority, question.priority);
    } else groups.set(id, { id, kind, ownerId: question.ownerId, label: labels[kind], description: descriptions[kind], fields: [question.field], evidenceIds: evidence.map(e => e.id), priority: question.priority });
  }
  if (!questions.length && session.stage !== 'restore') {
    const remaining = (session.recordingMode === 'simple' && session.gamePackId === 'catan-base' ? [] : session.preservations).filter(p => !p.packed);
    if (remaining.length) groups.set('pack', { id: `${session.captureEpoch}:pack`, kind: 'preparePack', label: '기록한 구성물 정리', description: '게임팩이 안내하는 묶음과 용기를 기록합니다.', fields: [], evidenceIds: [], priority: 0 });
    else groups.set('commit', { id: `${session.captureEpoch}:commit`, kind: 'requestCommit', label: '현재 판 저장', description: '원본과 기록을 하나의 저장본으로 남깁니다.', fields: [], evidenceIds: [], priority: 0 });
  }
  return [...groups.values()].sort((a, b) => b.priority - a.priority);
}
