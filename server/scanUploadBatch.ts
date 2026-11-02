import {mkdir,readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';
import {readJSON,writeJSON,ConflictError,type Objects} from './objects';import {CloudUploads} from './cloudUploads';
export interface ScanUploadItem {clientPhotoId:string;parentClientId?:string;[key:string]:any}
export interface ScanUploadManifest {runId:string;sessionId:string;epoch:string;items:{clientPhotoId:string;parentClientId?:string;evidenceId:string;meta:any;ticket?:string;pathname?:string;signedUrl?:string}[]}
const idOK=(s:unknown):s is string=>typeof s==='string'&&/^[-a-zA-Z0-9_]{1,100}$/.test(s);
/** Metadata only; image bytes never enter the batch manifest. */
export class ScanUploadBatches{
 constructor(private root:string,private objects?:Objects){}
 private key(session:string,run:string){if(!idOK(session)||!idOK(run))throw Error('사진 전송 식별자를 확인하세요.');return 'scan-upload-batches/'+session+'/'+run+'.json';}
 async load(session:string,run:string){const key=this.key(session,run);if(this.objects)return (await readJSON<ScanUploadManifest>(this.objects,key));try{const data=await readFile(path.join(this.root,key));return {value:JSON.parse(data.toString()) as ScanUploadManifest,etag:createHash('sha256').update(data).digest('hex')};}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw e;}}
 async mint(sessionId:string,epoch:string,runId:string,items:ScanUploadItem[]){
  if(!Array.isArray(items)||!items.length||items.length>6||items.some(i=>!idOK(i.clientPhotoId))||new Set(items.map(i=>i.clientPhotoId)).size!==items.length)throw Error('이번 전송은 고유한 사진 최대 6장입니다.');
  const prior=await this.load(sessionId,runId);if(prior&&prior.value.epoch!==epoch)throw Error('촬영 단계가 바뀌었습니다.');
  const manifest:ScanUploadManifest=structuredClone(prior?.value??{sessionId,epoch,runId,items:[]});
  const supplied=new Map(items.map(i=>[i.clientPhotoId,i]));
  const pending=new Set(items.map(i=>i.clientPhotoId));
  while(pending.size){let advanced=false;
   for(const clientId of pending){const input=supplied.get(clientId)!,parent=input.parentClientId?manifest.items.find(i=>i.clientPhotoId===input.parentClientId):undefined;
    if(input.parentClientId&&!parent)continue;
    const {clientPhotoId,parentClientId,...rest}=input,meta={...rest,...(parent?{sourceEvidenceId:parent.evidenceId}:{})};
    const old=manifest.items.find(i=>i.clientPhotoId===clientId);
    if(old){if(JSON.stringify(old.meta)!==JSON.stringify(meta)||old.parentClientId!==parentClientId)throw Error('사진 전송 정보가 바뀌었습니다.');}
    else{manifest.items.push({clientPhotoId,...(parentClientId?{parentClientId}:{}),evidenceId:randomUUID(),meta});}
    pending.delete(clientId);advanced=true;
   }
   if(!advanced)throw Error('원본·확대 사진 관계를 확인하세요.');
  }
  if(manifest.items.length>6)throw Error('이번 전송은 최대 6장입니다.');
  if(JSON.stringify(prior?.value)===JSON.stringify(manifest))return manifest;
  if(this.objects)await Promise.all(manifest.items.filter(i=>!i.ticket).map(async i=>Object.assign(i,await new CloudUploads(this.objects!).mint('evidence',{...i.meta,scanBatchRunId:runId,scanBatchPhotoId:i.clientPhotoId},sessionId,epoch))));
  const key=this.key(sessionId,runId);
  if(this.objects){try{await writeJSON(this.objects,key,manifest,prior?.etag??null);}catch(e){if(!(e instanceof ConflictError))throw e;throw new ConflictError();}}
  else{const f=path.join(this.root,key);await mkdir(path.dirname(f),{recursive:true});await writeFile(f,JSON.stringify(manifest),{mode:0o600});}
  return manifest;
 }
 closed(manifest:ScanUploadManifest,successful:string[]){const selected=new Set(successful),accepted=new Set<string>();return manifest.items.filter(i=>{if(!selected.has(i.clientPhotoId)||i.parentClientId&&!accepted.has(i.parentClientId))return false;accepted.add(i.clientPhotoId);return true;});}
 async localURL(session:string,run:string,photo:string,url?:string){if(!idOK(photo))throw Error('사진 식별자를 확인하세요.');const f=path.join(this.root,this.key(session,run)+'.files',photo+'.json');if(url){await mkdir(path.dirname(f),{recursive:true});await writeFile(f,JSON.stringify({url}),{mode:0o600,flag:'wx'});return url;}try{return JSON.parse(await readFile(f,'utf8')).url as string;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw e;}}
}
