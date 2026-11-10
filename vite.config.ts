import { defineConfig,type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {copyRuntimePublic} from './tools/runtime-public-assets.ts';
function runtimePublic():Plugin{
 let publicRoot:string,outDir:string;
 return {name:'keepboard-runtime-public',apply:'build',configResolved(c){publicRoot=path.join(c.root,'public');outDir=path.resolve(c.root,c.build.outDir);},async closeBundle(){await copyRuntimePublic(publicRoot,outDir);}};
}
export default defineConfig(({command})=>({plugins:[react(),runtimePublic()],publicDir:command==='build'?false:'public',server:{host:'0.0.0.0'}}));
