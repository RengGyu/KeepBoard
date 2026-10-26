import {randomUUID} from 'node:crypto';
import {handleUpload,type HandleUploadBody} from '@vercel/blob/client';
import {head} from '@vercel/blob';import type {Request} from 'express';
import {BlobObjects} from './blobObjects.ts';import {readJSON,writeJSON,type Objects} from './objects.ts';
interface Ticket{key:string;purpose:'evidence'|'import';sessionId?:string;epoch?:string;meta:any;expires:number}
const imageTypes=['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml','image/avif','image/heic','image/heif'];
export class CloudUploads{
 constructor(readonly objects:Objects){}
 async mint(purpose:Ticket['purpose'],meta:any,sessionId?:string,epoch?:string){
  const type=meta.contentType;if(purpose==='evidence'?!imageTypes.includes(type):type!=='application/json')throw Error('업로드 파일 형식을 확인하세요.');
  const id=randomUUID(),ext=purpose==='import'?'json':type==='image/svg+xml'?'svg':type.split('/')[1],ticket:Ticket={purpose,sessionId,epoch,meta,expires:Date.now()+15*60000,key:(purpose==='evidence'?'uploads/':'imports/')+randomUUID()+'.'+ext};
  await writeJSON(this.objects,'upload-tickets/'+id+'.json',ticket,null);return {ticket:id,pathname:this.objects instanceof BlobObjects?this.objects.pathname(ticket.key):ticket.key};
 }
 async ticket(id:unknown){if(typeof id!=='string'||!/^[-a-f0-9]{36}$/.test(id))throw Error('업로드 원본을 확인하세요.');const t=(await readJSON<Ticket>(this.objects,'upload-tickets/'+id+'.json'))?.value;if(!t||t.expires<Date.now())throw Error('업로드 요청이 만료됐어요. 사진을 다시 선택해 주세요.');return t;}
 async token(req:Request,authorize:(ticket:Ticket)=>Promise<void>){return handleUpload({request:req,body:req.body as HandleUploadBody,onBeforeGenerateToken:async(path,payload)=>{const t=await this.ticket(payload);await authorize(t);if(!(this.objects instanceof BlobObjects)||path!==this.objects.pathname(t.key))throw Error('허용된 업로드 위치가 아닙니다.');return {allowedContentTypes:[t.meta.contentType],maximumSizeInBytes:t.purpose==='import'?80*1024*1024:60*1024*1024,validUntil:t.expires,addRandomSuffix:false,allowOverwrite:false};}});}
 async inspect(t:Ticket){if(this.objects instanceof BlobObjects){const h=await head(this.objects.pathname(t.key));if(h.contentType!==t.meta.contentType||h.size>(t.purpose==='import'?80:60)*1024*1024)throw Error('업로드 원본 형식을 확인하세요.');return;}
  const r=await this.objects.read(t.key);if(!r||r.contentType!==t.meta.contentType)throw Error('업로드 원본이 없습니다.');}
 async evidence(id:unknown,sessionId:string,epoch:string,meta:any){const t=await this.ticket(id);if(t.purpose!=='evidence'||t.sessionId!==sessionId||t.epoch!==epoch)throw Error('현재 기록에서 받은 사진 요청만 사용할 수 있어요.');for(const k of ['scope','ownerId','sourceEvidenceId','captureTarget','label','width','height'])if(JSON.stringify(meta[k])!==JSON.stringify(t.meta[k]))throw Error('사진의 범위나 원본 정보가 바뀌었어요.');await this.inspect(t);return '/uploads/'+t.key.split('/').at(-1);}
 async imported(id:unknown){const t=await this.ticket(id);if(t.purpose!=='import')throw Error('가져오기 원본을 확인하세요.');await this.inspect(t);const r=await this.objects.read(t.key);if(!r)throw Error('가져오기 원본을 찾을 수 없습니다.');return JSON.parse(r.data.toString());}
}
