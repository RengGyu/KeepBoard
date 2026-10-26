// Verification fallback for a partial snapshot without tsx. Product code does not use this loader.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
let ts;try { ts=require('typescript'); } catch { ts=require(process.env.KEEPBOARD_TYPESCRIPT_PATH||'/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
export async function resolve(specifier, context, next){
 if(specifier.startsWith('.')&&context.parentURL){
  const url=new URL(specifier,context.parentURL),p=fileURLToPath(url);
  for(const ext of ['', '.ts','.tsx','.js','.json'])if(fs.existsSync(p+ext)&&fs.statSync(p+ext).isFile())return {url:pathToFileURL(p+ext).href,shortCircuit:true};
 }
 return next(specifier,context);
}
export async function load(url,context,next){
 if(url.endsWith('.json'))return {format:'module',source:'export default '+fs.readFileSync(fileURLToPath(url),'utf8')+';',shortCircuit:true};
 if(/\.tsx?$/.test(url)){
  const result=ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},fileName:fileURLToPath(url)});
  return {format:'module',source:result.outputText,shortCircuit:true};
 }
 return next(url,context);
}
