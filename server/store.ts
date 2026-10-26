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
  private listChange: Promise<unknown> = Promise.resolve();
  private async hiddenSessions(): Promise<Record<string, { deletedAt: string }>> {
    return await this.readJSON<Record<string,{deletedAt:string}>>(path.join(this.root,'session-list.json'))??{};
  }
  async setSessionsHidden(ids: string[] | undefined, hidden: boolean): Promise<string[]> {
    const job = this.listChange.catch(() => undefined).then(async () => {
      const metadata = await this.hiddenSessions();
      const selected = ids ?? (await this.list<Session>('sessions')).filter(s => !metadata[s.id]).map(s => s.id);
      const changed: string[] = [];
      for (const id of [...new Set(selected)]) {
        if (!await this.getSession(id)) throw new Error('숨기거나 복원할 보드를 찾을 수 없습니다.');
        if (hidden && !metadata[id]) { metadata[id] = { deletedAt: new Date().toISOString() }; changed.push(id); }
        else if (!hidden && metadata[id]) { delete metadata[id]; changed.push(id); }
      }
      await this.atomicWrite(path.join(this.root, 'session-list.json'), metadata);
      return changed;
    });
    this.listChange = job;
    return job;
  }
  constructor(readonly root = path.resolve(process.env.KEEPBOARD_DATA_DIR || '.keepboard'), readonly publicRoot = path.resolve('public')) {}

  protected filename(kind: 'sessions' | 'packs', id: string) {
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error('잘못된 식별자입니다.');
    return path.join(this.root, kind, `${id}.json`);
  }

  protected async atomicWrite(filename: string, value: unknown) {
    await mkdir(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(value, null, 2), {mode:0o600});
    await rename(temporary, filename);
  }

  protected async readJSON<T>(filename:string):Promise<T|undefined>{
    try{return JSON.parse(await readFile(filename,'utf8'));}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error;}
  }
  async getSession(id:string):Promise<Session|undefined>{return this.readJSON<Session>(this.filename('sessions',id));}

  async saveSession(session: Session) {
    session.updatedAt = new Date().toISOString();
    await this.atomicWrite(this.filename('sessions', session.id), session);
  }

  protected async list<T>(kind: 'sessions' | 'packs'): Promise<T[]> {
    let files: string[];
    try { files = await readdir(path.join(this.root, kind)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    return Promise.all(files.filter(file => file.endsWith('.json')).map(async file => JSON.parse(await readFile(path.join(this.root, kind, file), 'utf8'))));
  }

  async listSessions(includeDeleted = false) {
    const hidden = await this.hiddenSessions();
    return (await this.list<Session>('sessions')).filter(s => includeDeleted || !hidden[s.id]).map(s => hidden[s.id] ? { ...s, deletedAt: hidden[s.id].deletedAt } : s).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
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

  async readEvidence(evidence:Evidence):Promise<{data:Buffer;mimeType:string}>{
    if(evidence.url.startsWith('data:image/')){const m=/^data:([^;]+);base64,(.+)$/s.exec(evidence.url);if(!m)throw Error('사진 형식을 확인하세요.');return {data:Buffer.from(m[2],'base64'),mimeType:m[1]};}
    const filename=evidence.url.startsWith('/uploads/')?path.join(this.root,'uploads',path.basename(evidence.url)):path.join(this.publicRoot,path.basename(evidence.url));
    const ext=path.extname(filename).slice(1).toLowerCase();return {data:await readFile(filename),mimeType:ext==='svg'?'image/svg+xml':ext==='jpg'?'image/jpeg':'image/'+ext};
  }
  private async evidenceData(evidence:Evidence){const r=await this.readEvidence(evidence);return 'data:'+r.mimeType+';base64,'+r.data.toString('base64');}

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
