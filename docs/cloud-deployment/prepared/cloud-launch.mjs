// One host / one process: existing gateway stays loopback-only; app uses the same volume.
import {readFile,mkdir,access,constants} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startGateway,validateConfig} from '../gateway/server.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
process.env.NODE_ENV='production';
if(!process.env.DEEPSEEK_API_KEY?.trim()&&process.env.KEEPBOARD_SYNTHETIC_CHECK!=='1')throw Error('DEEPSEEK_API_KEY must be registered by the operator; no fallback');
const data=process.env.KEEPBOARD_DATA_DIR;
if(!data||!path.isAbsolute(data))throw Error('KEEPBOARD_DATA_DIR must point to the persistent absolute directory');
await mkdir(data,{recursive:true,mode:0o700});await access(data,constants.W_OK);
const configFile=process.env.AI_GATEWAY_CONFIG||path.join(root,'deploy/gateway.json');
const config=validateConfig(JSON.parse(await readFile(configFile,'utf8')));
if(config.aliases['board-vision']?.model!=='deepseek-flash'||config.aliases['board-vision']?.effort!=='high')throw Error('Frozen board-vision model/high contract changed');
process.env.KEEPBOARD_AI_GATEWAY_URL=`http://127.0.0.1:${config.port}`;
process.env.KEEPBOARD_AI_ALIAS='board-vision';
const gateway=await startGateway(configFile);
let appServer;
try{
 const {createApp}=await import('../server/index.ts');
 const app=await createApp({ui:true});
 appServer=app.listen(Number(process.env.PORT||4319),process.env.HOST||'127.0.0.1');
 await new Promise((resolve,reject)=>{appServer.once('listening',resolve);appServer.once('error',reject);});
 console.log(JSON.stringify({event:'cloud-ready',port:appServer.address().port,gateway:'loopback',model:'deepseek-flash',effort:'high',synthetic:process.env.KEEPBOARD_SYNTHETIC_CHECK==='1'}));
}catch(error){gateway.closeAllConnections();gateway.close();throw error;}
let stopping=false;
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{
 if(stopping)return;stopping=true;
 // Restart recovery marks unfinished work interrupted; never repeat a billed request.
 const timer=setTimeout(()=>{appServer.closeAllConnections();gateway.closeAllConnections();process.exit(0);},5000);timer.unref();
 let remaining=2;const done=()=>{if(--remaining===0){clearTimeout(timer);process.exit(0);}};
 appServer.close(done);gateway.close(done);appServer.closeIdleConnections();gateway.closeIdleConnections();
});
