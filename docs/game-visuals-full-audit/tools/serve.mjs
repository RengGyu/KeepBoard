import {createServer} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const project=process.cwd(),meta=JSON.parse(await readFile('docs/game-visuals-full-audit/work-paths.json','utf8'));
async function receive(req,res){try{if(req.method!=='POST')throw Error('POST only');const name=decodeURIComponent((req.url??'').slice(1));if(!/^[a-zA-Z0-9/_.,-]+\.(json|svg|png)$/.test(name)||name.split('/').includes('..'))throw Error('invalid artifact path');let body='';for await(const c of req){body+=c;if(body.length>35e6)throw Error('artifact too large');}const file=path.join(meta.output,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,name.endsWith('.png')?Buffer.from(body.replace(/^data:image\/png;base64,/,''),'base64'):body);res.end('saved');}catch(e){res.statusCode=400;res.end(String(e));}}
const server=await createServer({configFile:false,envDir:false,root:meta.snapshot,esbuild:{jsx:'automatic'},plugins:[{name:'audit-artifacts',configureServer(s){s.middlewares.use('/__audit',receive);}}],server:{host:'127.0.0.1',port:0,strictPort:true},appType:'mpa'});
await server.listen();console.log('VISUAL_AUDIT_URL='+server.resolvedUrls.local[0]+'audit/index.html');
process.on('SIGINT',async()=>{await server.close();process.exit(0);});
