import {createHash} from 'node:crypto';import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:4403',health=await fetch(base+'/api/health'),catalog=await fetch(base+'/api/game-catalog');
const h=await health.json(),games=await catalog.json();if(health.status!==200||!h.ok||catalog.status!==200||games.length!==120)throw new Error('Synthetic preview health/catalog mismatch');
const script=await fetch(base+'/src/RoomEntry.tsx'),body=await script.text();if(script.status!==200||!body.includes('createRoom'))throw new Error('Room module not served');
const result={synthetic:true,base,health:health.status,catalogStatus:catalog.status,catalogCount:games.length,roomModuleStatus:script.status,roomModuleSHA256:createHash('sha256').update(body).digest('hex'),realAI:0};await writeFile(new URL('./serving.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
