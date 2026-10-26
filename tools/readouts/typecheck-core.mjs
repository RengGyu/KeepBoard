import{createRequire}from'node:module';import{resolve,dirname}from'node:path';import{readdirSync,existsSync}from'node:fs';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript');}catch{ts=require(process.env.KEEPBOARD_TYPESCRIPT_PATH||'/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):e.name.endsWith('.ts')?[d+'/'+e.name]:[]);
const files=[...walk('shared/readouts'),'shared/genericRecord.ts','server/ai/gameReadouts.ts','server/ai/generic.ts','tests/game-readout-types.compile.ts'];
const localTypes=resolve('node_modules/@types'),fallback='/opt/nvm/versions/node/v22.16.0/lib/node_modules/ts-node/node_modules/@types';
const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,esModuleInterop:true,resolveJsonModule:true,allowImportingTsExtensions:true,skipLibCheck:true,noEmit:true,types:['node'],typeRoots:[existsSync(localTypes)?localTypes:fallback]};
const p=ts.createProgram(files,options),diagnostics=ts.getPreEmitDiagnostics(p);for(const d of diagnostics)console.error(ts.flattenDiagnosticMessageText(d.messageText,'\n'),d.file?.fileName,d.start===undefined?'':d.file?.getLineAndCharacterOfPosition(d.start));
console.log(`TypeScript ${ts.version}; core + generated contracts; ${diagnostics.length} diagnostics. This is not the full application build.`);process.exitCode=diagnostics.length?1:0;
