import {encodeSession,decodeSession} from './sessionCodec';
import {SessionIndex,emptySessionIndex} from './sessionIndex';
import {thumbnailJPEG,thumbnailName} from './thumbnail';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Evidence, GamePack, Session } from '../shared/types.ts';

export interface SessionExport {
  format: 'keepboard/v1';
  session: Session;
  evidenceData: Record<string, string>;
}

const documentChanges=new Map<string,Promise<unknown>>();
export class Store {
  private readonly summaries=new SessionIndex({read:()=>this.readJSON(path.join(this.root,'session-summaries.json')),mutate:change=>this.mergeUploadDocument<any>(path.join(this.root,'session-summaries.json'),old=>{const index=old??emptySessionIndex();change(index);return index;}),sessions:()=>this.list<Session>('sessions'),session:id=>this.getSession(id)});
  async listSessionSummaries(includeDeleted=false,memberHash?:string){return this.summaries.list(includeDeleted,await this.hiddenSessions(),memberHash);}
  async getSessionAccess(id:string){return this.summaries.access(id);}
  protected transferVersion(_from:object,_to:object){}
  private uploadChange: Promise<unknown> = Promise.resolve();
  private knownUploadRefs = new Set<string>();
  private uploadIndexPath(filename:string){return path.join(this.root,'upload-references',filename+'.json');}
  /** Old URLs remain unchanged. This one-time migration runs before serving requests,
   * never inside the photo handler. Entries are additive; live sessions remain authoritative. */
  async prepareUploadReferences(){
    const marker=path.join(this.root,'upload-references','ready.json');
    if(await this.readJSON(marker))return;
    for(const session of await this.list<Session>('sessions'))await this.recordUploadReferences(session);
    await this.mergeUploadDocument(marker,old=>old?undefined:{version:1});
  }
  protected async mergeUploadDocument<T>(filename:string,update:(old:T|undefined)=>T|undefined){
    const work=(documentChanges.get(filename)??Promise.resolve()).catch(()=>undefined).then(async()=>{
      for(let attempt=0;;attempt++){
        const old=await this.readJSON<T>(filename),next=update(old);if(next===undefined)return;
        try{await this.atomicWrite(filename,next);return;}catch(error){if((error as {status?:number}).status!==409||attempt>=7)throw error;}
      }
    });documentChanges.set(filename,work);try{await work;}finally{if(documentChanges.get(filename)===work)documentChanges.delete(filename);}
  }
  protected async recordUploadReferences(session:Session){
    const filenames=new Set([...session.evidence,...session.snapshots.flatMap(s=>s.evidence)].filter(e=>e.url.startsWith('/uploads/')).flatMap(e=>[path.basename(e.url),...(e.thumbnailUrl?.startsWith('/uploads/')?[path.basename(e.thumbnailUrl)]:[])]));
    const work=this.uploadChange.catch(()=>undefined).then(async()=>{
      for(const filename of filenames){
        const key=JSON.stringify([filename,session.id]);if(this.knownUploadRefs.has(key))continue;
        await this.mergeUploadDocument<string[]>(this.uploadIndexPath(filename),old=>{
          if(old?.includes(session.id))return undefined;
          // Keep the same object when updating, for BlobStore's CAS token.
          const ids=old??[];ids.push(session.id);return ids;
        });
        this.knownUploadRefs.add(key);
      }
    });this.uploadChange=work;await work;
  }
  async sessionsForUpload(filename:string):Promise<Session[]>{
    if(!filename||filename!==path.basename(filename))return [];
    const ids=await this.readJSON<string[]>(this.uploadIndexPath(filename))??[];
    const sessions=await Promise.all(ids.map(id=>this.getSession(id)));
    return sessions.filter((s):s is Session=>!!s);
  }
  private listChange: Promise<unknown> = Promise.resolve();
  protected async hiddenSessions(): Promise<Record<string, { deletedAt: string }>> {
    return await this.readJSON<Record<string,{deletedAt:string}>>(path.join(this.root,'session-list.json'))??{};
  }
  async setSessionsHidden(ids: string[] | undefined, hidden: boolean): Promise<string[]> {
    const job = this.listChange.catch(() => undefined).then(async () => {
      const metadata=await this.hiddenSessions(),selected=ids??(await this.list<Session>('sessions')).filter(s=>!metadata[s.id]).map(s=>s.id);
      for(const id of [...new Set(selected)])if(!await this.getSession(id))throw new Error('숨기거나 복원할 보드를 찾을 수 없습니다.');
      let changed:string[]=[],updated:Record<string,{deletedAt:string}>={};
      await this.mergeUploadDocument<Record<string,{deletedAt:string}>>(path.join(this.root,'session-list.json'),old=>{
        updated=old??{};changed=[];
        for(const id of [...new Set(selected)]){if(hidden&&!updated[id]){updated[id]={deletedAt:new Date().toISOString()};changed.push(id);}else if(!hidden&&updated[id]){delete updated[id];changed.push(id);}}
        return updated;
      });
      await this.summaries.hidden(changed,updated).catch(()=>undefined);
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
    await writeFile(temporary, JSON.stringify(value), {mode:0o600});
    await rename(temporary, filename);
  }

  protected async readJSON<T>(filename:string):Promise<T|undefined>{
    try{return JSON.parse(await readFile(filename,'utf8'));}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error;}
  }
  async getSession(id:string):Promise<Session|undefined>{const stored=await this.readJSON<object>(this.filename('sessions',id));if(!stored)return;const session=decodeSession(stored);this.transferVersion(stored,session);return session;}

  async saveSession(session: Session) {
    const token=randomUUID();await this.summaries.begin(session.id,token);
    try{
      await this.recordUploadReferences(session);
      session.updatedAt=new Date().toISOString();session.storageRevision=token;
      const stored=encodeSession(session);this.transferVersion(session,stored);
      await this.atomicWrite(this.filename('sessions',session.id),stored);this.transferVersion(stored,session);
    }catch(error){const previous=await this.getSession(session.id).catch(()=>undefined);await this.summaries.finish(session.id,token,previous).catch(()=>undefined);throw error;}
    // Source is authoritative. A failed index finalization remains pending and repairs from this exact committed token on the next read.
    await this.summaries.finish(session.id,token,session).catch(()=>undefined);
  }

  protected async list<T>(kind: 'sessions' | 'packs'): Promise<T[]> {
    let files: string[];
    try { files = await readdir(path.join(this.root, kind)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    return (await Promise.all(files.filter(file=>file.endsWith('.json')).map(file=>kind==='sessions'?this.getSession(file.slice(0,-5)) as Promise<T|undefined>:this.readJSON<T>(path.join(this.root,kind,file))))).filter((x):x is Awaited<T>=>x!==undefined) as T[];
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
    await this.createThumbnail(filename,bytes);
    return `/uploads/${filename}`;
  }


  protected async createThumbnail(filename:string,bytes:Buffer){try{const jpeg=await thumbnailJPEG(bytes);if(jpeg)await writeFile(path.join(this.root,'uploads',thumbnailName(filename)),jpeg,{mode:0o600});}catch{/* The durable original remains usable. */}}
  async evidenceThumbnail(url:string):Promise<string|undefined>{if(!url.startsWith('/uploads/'))return;const filename=thumbnailName(path.basename(url));try{await readFile(path.join(this.root,'uploads',filename));return '/uploads/'+filename;}catch{return undefined;}}

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
      item.thumbnailUrl=await this.evidenceThumbnail(item.url);
    }
    session.id = randomUUID();
    await this.saveSession(session);
    return session;
  }
}
