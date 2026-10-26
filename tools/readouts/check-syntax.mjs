// Parse/transpile only, NOT a replacement for full application typechecking.
import {readFileSync,readdirSync} from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript');}catch{ts=require(process.env.KEEPBOARD_TYPESCRIPT_PATH||'/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const files=['src/GameEssentials.tsx','src/GameBoardRecord.tsx','src/SplendorEditor.tsx','server/engine.ts',...readdirSync('src/readouts').filter(x=>x.endsWith('.tsx')).map(x=>'src/readouts/'+x)];let bad=0;
for(const file of files){const r=ts.transpileModule(readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error){bad++;console.error(file,ts.flattenDiagnosticMessageText(d.messageText,'\n'));}}
console.log(JSON.stringify({files,syntaxErrors:bad,fullTypecheck:false},null,2));process.exitCode=bad?1:0;
