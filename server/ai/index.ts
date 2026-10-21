import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AISettings, AIStatus, AnalysisResult, Assertion, Evidence, GamePack, Session, Value } from '../../shared/types.ts';
import { observationPrompt, gamePackPrompt } from './prompt.ts';
import { normalizeSceneDetailed } from '../../shared/scene.ts';
import { isSceneField } from '../../shared/sceneFields.ts';
import { assembleSceneAssertions } from './sceneAssembly.ts';

const dataDir = () => path.resolve(process.env.KEEPBOARD_DATA_DIR || '.keepboard');
const configFile = () => path.join(dataDir(), 'ai-settings.json');

async function settings(): Promise<AISettings> {
  let stored: Partial<AISettings> = {};
  try { stored = JSON.parse(await readFile(configFile(), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const provider = stored.provider || (process.env.AI_PROVIDER === 'openai' ? 'openai' : 'gemini');
  return {
    provider,
    model: stored.model || process.env.AI_MODEL || (provider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-6.1-sol'),
    apiKey: stored.apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY : process.env.OPENAI_API_KEY),
    baseUrl: stored.baseUrl || process.env.AI_BASE_URL,
  };
}

export async function getAIStatus(): Promise<AIStatus> {
  const config = await settings();
  return { configured: Boolean(config.apiKey), provider: config.provider, model: config.model, baseUrl: config.baseUrl };
}

export async function saveAISettings(input: AISettings): Promise<AIStatus> {
  if (!['gemini', 'openai'].includes(input.provider)) throw new Error('Gemini 또는 OpenAI를 선택해 주세요.');
  if (!input.model?.trim()) throw new Error('사용할 모델 이름을 입력해 주세요.');
  const previous = await settings();
  const config: AISettings = {
    provider: input.provider, model: input.model.trim(),
    apiKey: input.apiKey?.trim() || (previous.provider === input.provider ? previous.apiKey : undefined),
    baseUrl: input.baseUrl?.trim() || undefined,
  };
  await mkdir(dataDir(), { recursive: true });
  await writeFile(configFile(), JSON.stringify(config, null, 2), { mode: 0o600 });
  return getAIStatus();
}

export function parseModelJSON(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(cleaned); }
  catch { throw new Error('모델 응답을 읽지 못했습니다. 원본을 유지했습니다. 다시 분석하거나 직접 입력해 주세요.'); }
}

type ImageInput = { mimeType: string; data: string };

async function readImage(evidence: Evidence): Promise<ImageInput> {
  if (evidence.url.startsWith('data:image/')) {
    const match = evidence.url.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
    if (!match) throw new Error('사진 형식을 읽지 못했습니다.');
    return { mimeType: match[1], data: match[2] };
  }
  if (!evidence.url.startsWith('/uploads/')) throw new Error('업로드한 사진만 실제 판독할 수 있습니다.');
  const file = path.basename(evidence.url);
  const ext = path.extname(file).toLowerCase();
  const mimeType = ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' } as Record<string,string>)[ext];
  if (!mimeType) throw new Error('JPEG, PNG, WebP 사진을 사용해 주세요.');
  return { mimeType, data: (await readFile(path.join(dataDir(), 'uploads', file))).toString('base64') };
}

async function requestJSON(prompt: string, images: ImageInput[], config: AISettings): Promise<unknown> {
  if (!config.apiKey) throw new Error('설정에서 AI API 키를 연결해 주세요.');
  const isGemini = config.provider === 'gemini';
  const base = (config.baseUrl || (isGemini ? 'https://generativelanguage.googleapis.com/v1beta' : 'https://api.openai.com/v1')).replace(/\/$/, '');
  const endpoint = isGemini ? `${base}/models/${encodeURIComponent(config.model)}:generateContent` : `${base}/responses`;
  const body = isGemini ? {
    contents: [{ role: 'user', parts: [{ text: prompt }, ...images.map(i => ({ inline_data: { mime_type: i.mimeType, data: i.data } }))] }],
    generationConfig: { responseMimeType: 'application/json' },
  } : {
    model: config.model,
    input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, ...images.map(i => ({ type: 'input_image', image_url: `data:${i.mimeType};base64,${i.data}`, detail: 'high' }))] }],
    text: { format: { type: 'json_object' } },
  };
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(isGemini ? { 'x-goog-api-key': config.apiKey } : { Authorization: `Bearer ${config.apiKey}` }) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw new Error((error as Error).name === 'TimeoutError' ? '분석 시간이 길어졌습니다. 원본은 남아 있습니다. 사진을 줄이거나 필요한 영역만 다시 분석해 주세요.' : 'AI 서버에 연결하지 못했습니다. API 주소와 연결을 확인해 주세요.');
  }
  const payload = await response.json() as Record<string, any>;
  if (!response.ok) {
    // Show the provider's actionable error, never its request headers or key.
    const detail = String(payload.error?.message || payload.message || '').replaceAll(config.apiKey, '[key]').slice(0, 350);
    throw new Error(`AI 연결 오류 (${response.status}): ${detail || '모델 이름과 API 키를 확인해 주세요.'}`);
  }
  const text = isGemini
    ? (payload.candidates?.[0]?.content?.parts || []).map((part: any) => part.text || '').join('')
    : payload.output_text || (payload.output || []).flatMap((item: any) => item.content || []).filter((part: any) => part.type === 'output_text').map((part: any) => part.text).join('');
  if (!text) throw new Error('모델이 판독 결과를 반환하지 않았습니다. 다른 사진으로 다시 시도해 주세요.');
  return parseModelJSON(text);
}

function matchesType(value: unknown, type: string): value is Value {
  if (value === null || value === undefined) return false;
  if (type === 'json') return typeof value === 'object';
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'boolean') return typeof value === 'boolean';
  return typeof value === 'string';
}

export function normalizeObservations(raw: unknown, pack: GamePack, evidence: Evidence[], turnInstanceId: string, playerIds: readonly string[] = []): AnalysisResult {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as any).assertions)) throw new Error('상태 목록이 없는 모델 응답입니다. 원본을 다시 분석해 주세요.');
  const result = raw as { assertions: Record<string, unknown>[]; summary?: string; warnings?: string[] };
  const assertions: Assertion[] = [];
  const warnings = Array.isArray(result.warnings) ? result.warnings.filter(v => typeof v === 'string') : [];
  for (const item of result.assertions) {
    let definition = pack.fields.find(f => f.key === item.field && f.acquisition === 'observe');
    let ownerId = evidence[0]?.ownerId;
    if (!definition || !matchesType(item.value,definition.type)) continue;
    if (definition.scope === 'player') {
      if (!ownerId) { if (definition.visibility !== 'public' || typeof item.ownerId !== 'string' || !playerIds.includes(item.ownerId)) continue; ownerId=item.ownerId; }
      else if (item.ownerId && item.ownerId !== ownerId) continue;
    } else if (ownerId) continue;
    if (definition.type === 'select' && !definition.options?.some(o => o.value === item.value)) continue;
    const evidenceIds = Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((id): id is string => typeof id === 'string' && evidence.some(e => e.id === id)) : [];
    if (!evidenceIds.length) continue;
    let value = item.value as Value;
    if (isSceneField(definition)) {
      try {
        const normalized = normalizeSceneDetailed(item.value, evidenceIds);
        if (!normalized.recognized || !normalized.scene.components.length) { warnings.push('개별 구성물 형식의 판독 결과가 없습니다. 원본을 유지했습니다.'); continue; }
        const scene = normalized.scene;
        for (const component of scene.components) if (playerIds.length && component.ownerId && !playerIds.includes(component.ownerId)) { component.ownerId = null; warnings.push('플레이어에 연결되지 않은 색은 소유자 미확인으로 남겼습니다.'); }
        const observedHexes = new Set(scene.components.filter(c => c.kind === 'terrain' && c.location.type === 'hex').map(c => c.location.id));
        if (definition.key === 'board.layout' && (scene.coverage !== 'full' || observedHexes.size !== 19)) {
          const partialField = pack.fields.find(f => f.key === 'components.observed' && f.acquisition === 'observe');
          if (!partialField) { warnings.push('전체 판 배치가 아닌 부분 구성물입니다. 전체 판을 추가 촬영해 주세요.'); continue; }
          definition = partialField;
          scene.coverage = scene.coverage === 'catalog' ? 'catalog' : 'partial';
        }
        value = scene as unknown as Value;
      } catch { warnings.push('구성물 기록 형식을 읽지 못했습니다. 원본 사진은 유지됩니다.'); continue; }
    }
    const region = item.region as Record<string, number> | undefined;
    const validRegion = region && ['x','y','width','height'].every(k => typeof region[k] === 'number' && region[k] >= 0 && region[k] <= 1) && region.width > 0 && region.height > 0 && region.x + region.width <= 1.001 && region.y + region.height <= 1.001;
    const assertion: Assertion = {
      id: randomUUID(), field: definition.key, value, ownerId,
      basis: 'observation', status: 'candidate', evidenceIds,
      confidence: typeof item.confidence === 'number' ? Math.min(1, Math.max(0, item.confidence)) : undefined,
      reason: typeof item.reason === 'string' ? item.reason : undefined,
      turnInstanceId, updatedAt: new Date().toISOString(),
      ...(validRegion ? { region: { x: region.x, y: region.y, width: region.width, height: region.height } } : {}),
    };
    const duplicate = assertions.findIndex(a => a.field === assertion.field && a.ownerId === assertion.ownerId);
    if (duplicate >= 0 && !isSceneField(definition)) assertions[duplicate] = assertion;
    else assertions.push(assertion);
  }
  if (!assertions.length) warnings.push('확인 가능한 상태를 찾지 못했습니다. 필요한 영역을 더 가까이 촬영하거나 직접 입력해 주세요.');
  const assembled = assembleSceneAssertions(assertions, evidence, new Set(pack.fields.filter(isSceneField).map(f => f.key)));
  return { assertions: assembled, summary: typeof result.summary === 'string' ? result.summary : `${assembled.length}개 상태 후보를 읽었습니다.`, mode: 'live', warnings };
}

export async function analyzeEvidence(input: { session: Session; evidence: Evidence[]; pack: GamePack; purpose?: string; instruction?: string; timings?: Record<string, number> }): Promise<AnalysisResult> {
  const config = await settings();
  if (!config.apiKey) return {
    assertions: [], summary: '사진 원본을 보관했습니다. AI 설정을 연결하면 판독할 수 있습니다. 필요한 상태는 지금 직접 입력할 수도 있습니다.',
    mode: 'manual', warnings: ['실제 사진 분석은 AI API 연결 후 사용할 수 있습니다.'],
  };
  const photos = input.evidence.filter(e => e.kind === 'photo');
  if (!photos.length) throw new Error('분석할 사진을 먼저 촬영하거나 올려 주세요. 예시 그림은 실제 사진 판독에 사용하지 않습니다.');
  const groups = new Map<string, Evidence[]>();
  for (const photo of photos) {
    const key = JSON.stringify([photo.ownerId ?? null, photo.captureEpoch]);
    groups.set(key, [...(groups.get(key) || []), photo]);
  }
  const results: AnalysisResult[] = [];
  for (const all of groups.values()) {
    // Keep owner contexts separate; batch originals instead of sending every frame at once.
    for (let offset = 0; offset < all.length; offset += 6) {
      const batch = all.slice(offset, offset + 6);
      let at = performance.now();
      const images = await Promise.all(batch.map(readImage));
      if (input.timings) input.timings.images = (input.timings.images ?? 0) + performance.now() - at;
      at = performance.now();
      const raw = await requestJSON(observationPrompt(input.session, input.pack, batch, input.instruction, input.purpose), images, config);
      if (input.timings) input.timings.provider = (input.timings.provider ?? 0) + performance.now() - at;
      at = performance.now();
      results.push(normalizeObservations(raw, input.pack, batch, input.session.turnInstanceId, input.session.players.map(p=>p.id)));
      if (input.timings) input.timings.normalize = (input.timings.normalize ?? 0) + performance.now() - at;
    }
  }
  return {
    assertions: assembleSceneAssertions(results.flatMap(r => r.assertions), photos, new Set(input.pack.fields.filter(isSceneField).map(f => f.key))), summary: results.map(r => r.summary).join('\n'),
    mode: 'live', warnings: results.flatMap(r => r.warnings),
  };
}

export function validateGeneratedPack(raw: unknown): GamePack {
  const pack = raw as GamePack;
  if (!pack?.id || !pack.title || !pack.version || !Array.isArray(pack.fields) || !pack.fields.length || !Array.isArray(pack.requirements) || !Array.isArray(pack.derivedRules) || !Array.isArray(pack.preservationTemplates) || !Array.isArray(pack.sources) || !Array.isArray(pack.supportGaps)) throw new Error('게임팩의 필수 항목이 없습니다. 자료를 보완해 다시 생성해 주세요.');
  const keys = new Set<string>();
  for (const f of pack.fields) {
    if (!f.key || keys.has(f.key) || !f.label || !['public','player'].includes(f.scope) || !['text','number','boolean','select','json'].includes(f.type) || !['observe','ask','preserve'].includes(f.acquisition)) throw new Error('게임팩 상태 정의가 올바르지 않습니다.');
    if (f.type === 'select' && (!Array.isArray(f.options) || !f.options.length)) throw new Error(`${f.label}: 선택지가 없습니다.`);
    keys.add(f.key);
  }
  for (const r of pack.requirements) if (!Array.isArray(r.fields) || r.fields.some(f => !keys.has(f))) throw new Error('요구사항이 선언되지 않은 상태를 참조합니다.');
  for (const r of pack.derivedRules) if (!keys.has(r.field)) throw new Error('도출 규칙이 선언되지 않은 상태를 참조합니다.');
  pack.supportGaps = [...pack.supportGaps, 'AI 생성 초안입니다. 제공 자료 범위에서 생성했으며 실제 게임의 저장·재개 성능은 확인 전입니다.'];
  return pack;
}

export async function generateGamePack(input: { title: string; edition?: string; sourceText: string }): Promise<GamePack> {
  if (!input.title?.trim() || !input.sourceText?.trim()) throw new Error('게임 이름과 규칙 자료를 입력해 주세요.');
  const config = await settings();
  if (!config.apiKey) throw new Error('게임팩 자동 생성에는 AI 연결이 필요합니다. 설정에서 API 키를 연결해 주세요.');
  const { catanPack } = await import('../../gamepacks/catan.ts');
  return validateGeneratedPack(await requestJSON(gamePackPrompt(input, catanPack), [], config));
}
