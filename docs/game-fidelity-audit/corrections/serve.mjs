// Art-only disposable Vite server; no API proxy, env settings, sessions or keys.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
async function capture(req,res){
 if(req.method!=='POST'){res.statusCode=405;res.end();return;}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>15_000_000){res.statusCode=413;res.end();return;}}
 if(req.url==='/svg'&&raw.startsWith('<svg ')){await mkdir('docs/game-fidelity-audit/corrections/screenshots',{recursive:true});await writeFile('docs/game-fidelity-audit/corrections/screenshots/contact.svg',raw);res.end('saved');return;}
 if(!raw.startsWith('data:image/png;base64,')){res.statusCode=400;res.end();return;}
 const bytes=Buffer.from(raw.split(',')[1],'base64');if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){res.statusCode=400;res.end();return;}
 await mkdir('docs/game-fidelity-audit/corrections/screenshots',{recursive:true});await writeFile('docs/game-fidelity-audit/corrections/screenshots/contact.png',bytes);res.end('saved');
}
const server=await createServer({configFile:false,root:process.cwd(),envDir:false,esbuild:{jsx:'automatic'},plugins:[{name:'art-only-capture',configureServer(s){s.middlewares.use('/__art-capture',capture);}}],server:{host:'127.0.0.1',port:0,strictPort:true},appType:'mpa'});
await server.listen();console.log('ART_ONLY_PREVIEW='+server.resolvedUrls.local[0]+'docs/game-fidelity-audit/corrections/preview.html');
process.on('SIGINT',async()=>{await server.close();process.exit(0);});
