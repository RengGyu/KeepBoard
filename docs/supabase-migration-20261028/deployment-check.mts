import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

const deployment=process.argv[2];assert.ok(deployment?.startsWith('https://keepboard-'));
const stage=(await readFile('/private/tmp/kb-supabase-release-path','utf8')).trim();
const cli='/Users/jeonggyuju/.npm/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js';
const dir='/private/tmp/kb-supabase-deployment-smoke';await mkdir(dir,{recursive:true,mode:0o700});
let n=0;const endpoints:{path:string;status:number}[]=[];
async function call(path:string,body?:unknown,method=body?'POST':'GET',json=true){
 const file=dir+'/'+(++n)+'.response';
 const args=[cli,'curl',path,'--deployment',deployment,'--','-sS','-o',file,'-w','%{http_code}','-X',method];
 if(body){const input=dir+'/'+n+'.request';await writeFile(input,JSON.stringify(body),{mode:0o600});args.push('-H','Content-Type: application/json','--data-binary','@'+input);}
 const output=await new Promise<string>((resolve,reject)=>{const p=spawn(process.execPath,args,{cwd:stage,stdio:['ignore','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.resume();p.on('close',code=>code?reject(Error('CLI request failed')):resolve(out));});
 const status=Number(output.slice(-3)),bytes=await readFile(file);endpoints.push({path,status});assert.ok(status>=200&&status<300,'HTTP '+status+' '+path);return {status,bytes,data:json?JSON.parse(bytes.toString()):undefined};
}
const mode=(await call('/api/storage-mode')).data;assert.equal(mode.provider,'supabase');
const sessions=(await call('/api/sessions')).data;assert.ok(sessions.some((s:any)=>s.id==='469bea87-2d64-4162-85ad-0bcd4bcc8bf7'));
const catalog=(await call('/api/game-catalog')).data;assert.equal(catalog.length,120);
await call('/api/recognition/readers');
const recovered=(await call('/api/sessions/469bea87-2d64-4162-85ad-0bcd4bcc8bf7')).data;
const photo=await call(recovered.session.evidence[0].url,undefined,'GET',false);
assert.equal(createHash('sha256').update(photo.bytes).digest('hex'),'28ce72a474b4cd06f0995427a53a1c8ab815e0c3e3fa656143f91836c8254dbc');
const created=(await call('/api/sessions',{gamePackId:'catan-base',name:'저장 확인 · 임시 검사',recordingMode:'simple'})).data;
const sessionId=created.session.id,path='/api/sessions/'+sessionId;
const meta={scope:'public',label:'합성 저장 검사',width:1,height:1,expectedCaptureEpoch:created.session.captureEpoch};
const ticket=(await call(path+'/upload-ticket',{...meta,contentType:'image/png'})).data;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4N8AAAAASUVORK5CYII=','base64');
const uploaded=await fetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':'image/png','x-upsert':'false'},body:png});assert.ok(uploaded.ok);
const attached=(await call(path+'/evidence',{...meta,uploadTicket:ticket.ticket})).data;assert.equal(attached.session.evidence.length,1);
await call(path,{notes:{public:'Supabase 저장·재열기 확인'}},'PATCH');
await call(path+'/commit',{allowIncomplete:true,recordingMode:'simple'});
const reopened=(await call(path+'/resume',{scope:'public'})).data;
assert.equal(reopened.session.evidence.length,1);assert.equal(reopened.session.notes.public,'Supabase 저장·재열기 확인');
const original=await call(reopened.session.evidence[0].url,undefined,'GET',false);assert.deepEqual(original.bytes,png);
await call(path,undefined,'DELETE'); // Existing recoverable archive action, own disposable record only.
const report={checkedAt:new Date().toISOString(),deployment,provider:mode.provider,catalogGames:catalog.length,recoveredPhotoExact:true,directUpload:true,saveWithoutCorrection:true,reopenPhotoAndNotes:true,modelCalls:0,testBoardArchived:true,endpoints};
await writeFile(new URL('./deployment-smoke.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
