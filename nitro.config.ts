import {defineNitroConfig} from 'nitro/config';
export default defineNitroConfig({
 preset:'vercel',modules:['workflow/nitro'],
 vercel:{entryFormat:'node',functions:{maxDuration:300}},
 routes:{'/**':{handler:'./server/cloudEntry.ts',format:'node'}},
 // Vite already copies the runtime asset closure; never recopy raw working art.
 publicAssets:[{dir:'./cloud-dist'},{dir:'./public',ignore:['**/*']}],
});
