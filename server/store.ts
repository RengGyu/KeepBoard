import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Evidence, GamePack, Session } from '../shared/types.ts';

export interface SessionExport {
  format: 'keepboard/v1';
  session: Session;
  evidenceData: Record<string, string>;
}

export class Store {
  constructor(readonly root = path.resolve(process.env.KEEPBOARD_DATA_DIR || '.keepboard'), readonly publicRoot = path.resolve('public')) {}

  private filename(kind: 'sessions' | 'packs', id: string) {
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error('잘못된 식별자입니다.');
    return path.join(this.root, kind, `${id}.json`);
  }

  private async atomicWrite(filename: string, value: unknown) {
    await mkdir(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(value, null, 2));
    await rename(temporary, filename);
  }

  async getSession(id: string): Promise<Session | undefined> {
    try { return JSON.parse(await readFile(this.filename('sessions', id), 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  }

  async saveSession(session: Session) {
    session.updatedAt = new Date().toISOString();
    await this.atomicWrite(this.filename('sessions', session.id), session);
  }

  private async list<T>(kind: 'sessions' | 'packs'): Promise<T[]> {
    let files: string[];
    try { files = await readdir(path.join(this.root, kind)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    return Promise.all(files.filter(file => file.endsWith('.json')).map(async file => JSON.parse(await readFile(path.join(this.root, kind, file), 'utf8'))));
  }

  async listSessions() { return (await this.list<Session>('sessions')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async listPacks() { return this.list<GamePack>('packs'); }
  async savePack(pack: GamePack) { await this.atomicWrite(this.filename('packs', pack.id), pack); }

  async saveEvidence(dataUrl: string): Promise<string> {
    const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml|avif|heic|heif));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
    if (!match) throw new Error('base64 이미지 data URL을 입력하세요.');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length) throw new Error('이미지가 비어 있습니다.');
    const extension = match[1] === 'image/svg+xml' ? 'svg' : match[1].split('/')[1];
    const filename = `${randomUUID()}.${extension}`;
    await mkdir(path.join(this.root, 'uploads'), { recursive: true });
    await writeFile(path.join(this.root, 'uploads', filename), bytes);
    return `/uploads/${filename}`;
  }

  private async evidenceData(evidence: Evidence): Promise<string> {
    if (evidence.url.startsWith('data:image/')) return evidence.url;
    const filename = evidence.url.startsWith('/uploads/')
      ? path.join(this.root, 'uploads', path.basename(evidence.url))
      : path.join(this.publicRoot, path.basename(evidence.url));
    const extension = path.extname(filename).slice(1).toLowerCase();
    const mime = extension === 'svg' ? 'image/svg+xml' : extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    return `data:${mime};base64,${(await readFile(filename)).toString('base64')}`;
  }

  async exportSession(session: Session): Promise<SessionExport> {
    const evidence = [...session.evidence, ...session.snapshots.flatMap(snapshot => snapshot.evidence)];
    const data: Record<string, string> = {};
    for (const item of evidence) if (!data[item.id]) data[item.id] = await this.evidenceData(item);
    return { format: 'keepboard/v1', session: structuredClone(session), evidenceData: data };
  }

  async importSession(input: SessionExport): Promise<Session> {
    if (input?.format !== 'keepboard/v1' || !input.session?.gamePack || !Array.isArray(input.session.assertions) || !Array.isArray(input.session.evidence) || !Array.isArray(input.session.snapshots)) throw new Error('KeepBoard 내보내기 파일 형식이 아닙니다.');
    const session = structuredClone(input.session);
    const evidence = [...session.evidence, ...session.snapshots.flatMap(snapshot => snapshot.evidence)];
    const urls = new Map<string, string>();
    for (const item of evidence) {
      if (!urls.has(item.id)) {
        const data = input.evidenceData?.[item.id];
        if (!data) throw new Error(`근거 원본 누락: ${item.label}`);
        urls.set(item.id, await this.saveEvidence(data));
      }
      item.url = urls.get(item.id)!;
    }
    session.id = randomUUID();
    await this.saveSession(session);
    return session;
  }
}
