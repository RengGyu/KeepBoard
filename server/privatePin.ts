import {createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {readJSON,writeJSON,type Objects} from './objects.ts';
const scrypt=promisify(scryptCallback);
type PinRecord={salt:string;hash:string};
type Records=Record<string,Record<string,PinRecord>>;
export class PinError extends Error{constructor(message:string,readonly status=403){super(message);}}
export class PrivatePins{
 private tokens=new Map<string,{sessionId:string;ownerId:string;hash:string;expires:number}>();
 private attempts=new Map<string,{failures:number;until:number}>();
 private writes:Promise<unknown>=Promise.resolve();
 constructor(private root:string,private objects?:Objects){}
 private etags=new WeakMap<object,string>();
 private tokenKey(token:string){return 'auth/tokens/'+createHash('sha256').update(token).digest('hex')+'.json';}
 private async records():Promise<Records>{if(this.objects){const r=await readJSON<Records>(this.objects,'private-pins.json');if(r)this.etags.set(r.value,r.etag);return r?.value??{};}try{return JSON.parse(await readFile(path.join(this.root,'private-pins.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {};throw error;}}
 async configurationStamp(id:string,owner?:string){const r=owner?(await this.records())[id]?.[owner]:undefined;return createHash('sha256').update(JSON.stringify(r??null)).digest('hex');}
 async owners(id:string){return new Set(Object.keys((await this.records())[id]??{}));}
 async allowed(id:string,token?:string){
  const entry=token?(this.objects?(await readJSON<{sessionId:string;ownerId:string;hash:string;expires:number}>(this.objects,this.tokenKey(token)))?.value:this.tokens.get(token)):undefined;
  if(!entry||entry.sessionId!==id)return new Set<string>();
  if(entry.expires<Date.now()||(await this.records())[id]?.[entry.ownerId]?.hash!==entry.hash){this.tokens.delete(token!);return new Set<string>();}
  return new Set([entry.ownerId]);
 }
 async lock(token?:string){if(!token)return;this.tokens.delete(token);if(this.objects){const key=this.tokenKey(token),r=await this.objects.read(key);if(r)await this.objects.remove(key,r.etag);}}
 async require(id:string,owner:string|undefined,token?:string){if(owner&&(await this.owners(id)).has(owner)&&!(await this.allowed(id,token)).has(owner))throw new PinError('개인 정보를 열려면 4자리 비밀번호를 입력해 주세요.');}
 private async verify(id:string,owner:string,pin:unknown,client:string){
  const key=JSON.stringify([id,owner,client]),remoteKey='auth/attempts/'+createHash('sha256').update(key).digest('hex')+'.json',remote=this.objects?await readJSON<{failures:number;until:number}>(this.objects,remoteKey):undefined,attempt=this.objects?remote?.value:this.attempts.get(key);
  if(attempt&&attempt.until>Date.now()&&attempt.failures>=5)throw new PinError('잠시 후 다시 입력해 주세요. (1분)',429);
  const record=(await this.records())[id]?.[owner];
  if(!record)throw new PinError('설정된 비밀번호가 없어요.',400);
  let valid=false;
  if(typeof pin==='string'&&/^\d{4}$/.test(pin)){const hash=await scrypt(pin,record.salt,64) as Buffer;valid=timingSafeEqual(hash,Buffer.from(record.hash,'hex'));}
  if(!valid){const prior=attempt&&attempt.until>Date.now()?attempt.failures:0;const next={failures:prior+1,until:Date.now()+60000};if(this.objects)await writeJSON(this.objects,remoteKey,next,remote?.etag??null);else this.attempts.set(key,next);throw new PinError('비밀번호가 맞지 않아요.');}
  this.attempts.delete(key);if(this.objects&&remote)await this.objects.remove(remoteKey,remote.etag);return record;
 }
 async unlock(id:string,owner:string,pin:unknown,client:string){const record=await this.verify(id,owner,pin,client);const token=randomBytes(32).toString('hex');for(const [key,value]of this.tokens)if(value.expires<Date.now())this.tokens.delete(key);const entry={sessionId:id,ownerId:owner,hash:record.hash,expires:Date.now()+15*60000};if(this.objects)await writeJSON(this.objects,this.tokenKey(token),entry,null);else this.tokens.set(token,entry);return token;}
 async configure(id:string,owner:string,body:{enabled?:unknown;pin?:unknown;currentPin?:unknown},client:string){
  const job=this.writes.catch(()=>{}).then(async()=>{
   const records=await this.records();
   if(records[id]?.[owner])await this.verify(id,owner,body.currentPin,client);
   if(typeof body.enabled!=='boolean'||body.enabled&&(typeof body.pin!=='string'||!/^\d{4}$/.test(body.pin)))throw new PinError('숫자 4자리를 입력해 주세요.',400);
   records[id]??={};
   if(body.enabled){const salt=randomBytes(16).toString('hex');const hash=(await scrypt(body.pin as string,salt,64) as Buffer).toString('hex');records[id][owner]={salt,hash};}else delete records[id][owner];
   if(this.objects)await writeJSON(this.objects,'private-pins.json',records,this.etags.get(records)??null);else{await mkdir(this.root,{recursive:true});const file=path.join(this.root,'private-pins.json'),temp=file+'.tmp';await writeFile(temp,JSON.stringify(records),{mode:0o600});await rename(temp,file);}
   for(const[key,value]of this.tokens)if(value.sessionId===id&&value.ownerId===owner)this.tokens.delete(key);
  });this.writes=job;await job;
 }
}
