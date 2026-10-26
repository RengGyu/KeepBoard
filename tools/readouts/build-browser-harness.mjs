/** Isolated, synthetic UI harness. Does NOT replace missing application modules.
 * Uses existing production controlled components; React runtime supplied externally.
 * node tools/readouts/build-browser-harness.mjs /tmp/keepboard-ui
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript');}catch{ts=require(process.env.KEEPBOARD_TYPESCRIPT_PATH||'/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const out=resolve(process.argv[2]||'.readout-ui-harness');mkdirSync(out,{recursive:true});
const root=process.cwd(),modules=new Map(),css=new Set();
function moduleId(file){return relative(root,file).replaceAll('\\','/');}
function load(file){file=resolve(file);const id=moduleId(file);if(modules.has(id))return id;
 modules.set(id,'');if(file.endsWith('.json')){modules.set(id,'module.exports='+readFileSync(file,'utf8')+';');return id;}
 if(file.endsWith('.css')){css.add(readFileSync(file,'utf8'));modules.set(id,'');return id;}
 const result=ts.transpileModule(readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}});
 const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);if(errors.length)throw new Error(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n'));
 const code=result.outputText.replace(/require\("([^"\n]+)"\)/g,(all,spec)=>{
  if(spec==='react')return '__require("react")';
  if(!spec.startsWith('.'))throw new Error('External product dependency is not mocked: '+spec);
  const base=resolve(dirname(file),spec),dep=['','.ts','.tsx','.json','.css'].map(ext=>base+ext).find(existsSync);if(!dep)throw new Error('Missing actual module '+spec);
  return `__require(${JSON.stringify(load(dep))})`;
 });modules.set(id,code);return id;
}
for(const f of ['src/readouts/GameDetailFields.tsx','src/readouts/GameDetailReadout.tsx','src/readouts/CarcassonneLayoutPreview.tsx','shared/readouts/registry.ts'])load(f);
const packs=JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8'));
const fixtures={};for(const p of packs){const id=p.runtime?.source?.gameId,path='tests/fixtures/readouts/'+id+'.json';if(existsSync(path))fixtures[id]=JSON.parse(readFileSync(path,'utf8'));}
const relationCase=JSON.parse(readFileSync('tests/fixtures/carcassonne-relations.json','utf8'));
const entry=`
const React=window.React;
const {GameDetailFields}=__require('src/readouts/GameDetailFields.tsx');
const {GameDetailReadout}=__require('src/readouts/GameDetailReadout.tsx');
const {CarcassonneLayoutPreview}=__require('src/readouts/CarcassonneLayoutPreview.tsx');
const registry=__require('shared/readouts/registry.ts');
const packs=${JSON.stringify(packs)},fixtures=${JSON.stringify(fixtures)},relations=${JSON.stringify(relationCase)};
let host;
class Harness extends React.Component {
 constructor(props){super(props);this.state=this.makeState('carcassonne','tiles','typed');host=this;}
 makeState(game,kind,mode){if(mode==='relations')return {game:'carcassonne',kind,piece:structuredClone(relations.value.pieces.find(p=>p.componentId===kind)),record:structuredClone(relations.value),mode,updates:0,saved:null};const fixture=fixtures[game],entry=fixture.entries.find(e=>e.componentId===kind),p=structuredClone(entry[mode]||entry.typed||entry.legacy);if(mode==='invalid')p.readout={schema:'future-v999',kind,values:{hiddenFuture:9},sources:{}};return {game,kind,mode,piece:p,updates:0,saved:null,record:null};}
 change(game,kind,mode){this.setState(this.makeState(game,kind,mode));}
 render(){const {game,kind,piece,updates}=this.state,fixture=fixtures[game],pack=packs.find(p=>p.runtime?.source?.gameId===game),def=registry.readoutDefinition(pack),players=this.state.mode==='relations'?relations.players:fixture.players,record=this.state.record?{...this.state.record,pieces:this.state.record.pieces.map(p=>p.id===piece.id?piece:p)}:{version:'game-component-record-v1',pieces:[piece]};return React.createElement('div',null,
  React.createElement('header',null,React.createElement('span',{className:'kicker'},'KeepBoard · 합성 연결 검사'),React.createElement('h1',null,def.title),React.createElement('p',null,'실제 새 표시·수정 컴포넌트입니다. 아래 저장은 테스트용 브라우저 상태이며 원앱/API가 아닙니다.')),
  React.createElement('nav',{className:'pickers'},React.createElement('select',{'aria-label':'검사 게임',value:game,onChange:e=>this.change(e.target.value,fixtures[e.target.value].entries.find(e=>e.collection==='enabled').componentId,'typed')},Object.keys(fixtures).map(id=>React.createElement('option',{key:id,value:id},packs.find(p=>p.runtime?.source?.gameId===id).title))),React.createElement('select',{'aria-label':'검사 구성물',value:kind,onChange:e=>this.change(game,e.target.value,'typed')},def.components.filter(c=>fixture.entries.some(e=>e.componentId===c.id&&e.collection==='enabled')).map(c=>React.createElement('option',{key:c.id,value:c.id},c.name)))),
  React.createElement('main',null,
   React.createElement('article',{className:'display'},React.createElement('h2',null,'현재 기록'),React.createElement('p',null,piece.label),React.createElement('p',{className:'quantity'},'실물 수량 ',piece.quantity===null?'모름':piece.quantity),React.createElement(GameDetailReadout,{pack,piece,players}),React.createElement('p',{'data-testid':'updates'},'명시 수정 '+updates+'회')),
   React.createElement('article',{className:'editor'},React.createElement(GameDetailFields,{pack,piece,record,players,disabled:false,onPatch:patch=>this.setState(s=>({piece:{...s.piece,...patch},updates:s.updates+1}))}))),
  React.createElement(CarcassonneLayoutPreview,{pack,record,onSelect:id=>this.setState({piece:structuredClone(record.pieces.find(p=>p.id===id)),record})}),
  React.createElement('footer',null,React.createElement('button',{'data-testid':'fixture-save',onClick:()=>{window.__fixtureJSON=JSON.stringify(this.state.piece);this.setState({saved:true});}},'합성 JSON 왕복 보관'),React.createElement('button',{'data-testid':'fixture-reload',onClick:()=>this.setState({piece:JSON.parse(window.__fixtureJSON)})},'합성 JSON 왕복 복원'),React.createElement('span',null,this.state.saved?'합성 JSON 보관됨':'')));
 }
}
ReactDOM.render(React.createElement(Harness),document.getElementById('app'));
window.kbHarness={select:(g,k,m='typed')=>host.change(g,k,m),snapshot:()=>structuredClone(host.state),catalog:()=>Object.keys(fixtures).map(id=>({gameId:id,kinds:fixtures[id].entries.filter(e=>e.collection==='enabled').map(e=>e.componentId)})),rerender:()=>host.forceUpdate()};
`;
const bundle=`(function(){const modules={${[...modules].map(([k,v])=>JSON.stringify(k)+':function(module,exports,__require){\n'+v+'\n}').join(',\n')}};const cache={};function __require(id){if(id==='react')return window.React;if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,__require);return m.exports;}\n${entry}\n})();`;
new Function(bundle); // Syntax validation only; execution happens in the browser.
writeFileSync(out+'/bundle.js',bundle);
writeFileSync(out+'/harness.css',`*{box-sizing:border-box}body{margin:0;background:#f5f5f3;color:#242936;font-family:system-ui,sans-serif}#app{max-width:1120px;margin:auto;padding:20px}header{margin-bottom:20px}h1{margin:5px 0;font-size:28px}h2{font-size:18px}.kicker{font-size:13px;color:#665798}p{line-height:1.6}.pickers{display:flex;gap:10px;margin:12px 0 20px}.pickers select{min-width:0;width:50%;padding:12px;font-size:16px}main{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:24px}article{min-width:0;padding:20px;background:#fff;border:1px solid #deded8;border-radius:14px}footer{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}footer button{min-height:44px;padding:8px 16px}.quantity{font-size:20px;font-weight:bold}@media(max-width:600px){#app{padding:12px}main{grid-template-columns:1fr;gap:12px}article{padding:14px}}\n`+[...css].join('\n'));
writeFileSync(out+'/index.html','<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>KeepBoard 양식 연결 검사 — 합성</title><link rel="stylesheet" href="harness.css"><div id="app"></div><script src="react.js"></script><script src="react-dom.js"></script><script src="bundle.js"></script></html>');
console.log(`Wrote isolated harness to ${out}. Provide React + ReactDOM UMD as react.js/react-dom.js; no fake app modules, no API calls.`);
