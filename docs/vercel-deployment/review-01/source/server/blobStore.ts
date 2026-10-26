import path from 'node:path';import {randomUUID} from 'node:crypto';
import {Store} from './store.ts';import {readJSON,writeJSON,type Objects} from './objects.ts';
import type {Evidence,GamePack,Session} from '../shared/types.ts';
export class BlobStore extends Store{
 private etags=new WeakMap<object,string>();
 constructor(readonly objects:Objects){super('/blob',path.resolve('public'));}
 private key(filename:string){const key=path.relative(this.root,filename).split(path.sep).join('/');if(key.startsWith('../'))throw Error('Invalid store key');return key;}
 protected override async readJSON<T>(filename:string):Promise<T|undefined>{const r=await readJSON<T>(this.objects,this.key(filename));if(r&&r.value&&typeof r.value==='object')this.etags.set(r.value as object,r.etag);return r?.value;}
 protected override async atomicWrite(filename:string,value:unknown){await writeJSON(this.objects,this.key(filename),value,this.etags.get(value as object)??null).then(etag=>this.etags.set(value as object,etag));}
 protected override async list<T>(kind:'sessions'|'packs'):Promise<T[]>{const keys=await this.objects.list(kind+'/');const rows=await Promise.all(keys.filter(k=>k.endsWith('.json')).map(k=>this.readJSON<T>(path.join(this.root,k))));return rows.filter((x):x is Awaited<T>=>x!==undefined) as T[];}
 override async saveSession(s:Session){s.updatedAt=new Date().toISOString();(s as Session&{storageRevision?:string}).storageRevision=randomUUID();await this.atomicWrite(this.filename('sessions',s.id),s);}
 override async savePack(pack:GamePack){const old=await this.readJSON<object>(this.filename('packs',pack.id));if(old)this.etags.set(pack,this.etags.get(old)!);await this.atomicWrite(this.filename('packs',pack.id),pack);}
 override async saveEvidence(dataUrl:string){const m=/^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml|avif|heic|heif));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);if(!m)throw Error('이미지 원본을 확인하세요.');const data=Buffer.from(m[2],'base64');if(!data.length)throw Error('이미지가 비어 있습니다.');const filename=randomUUID()+'.'+(m[1]==='image/svg+xml'?'svg':m[1].split('/')[1]);await this.objects.write('uploads/'+filename,data,null,m[1]);return '/uploads/'+filename;}
 override async readEvidence(e:Evidence){if(!e.url.startsWith('/uploads/'))return super.readEvidence(e);const r=await this.objects.read('uploads/'+path.basename(e.url));if(!r)throw Error('사진 원본을 찾을 수 없습니다.');return {data:r.data,mimeType:r.contentType};}
}
