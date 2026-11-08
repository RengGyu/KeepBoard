/** Rebuilds saved-stage records from stored projections with the existing native-aware collector. No provider calls. */
import fs from 'node:fs/promises';import path from 'node:path';import {collectPersistedRecords} from '../../accuracy-goal-20261106/implementation/final-native-collector.mts';
const out='/private/tmp/kb-reading-fixes-final-scoring';await fs.mkdir(out,{recursive:true,mode:0o700});
const P='docs/accuracy-goal-20261106/implementation/final/tasks',arms:[string,string][]=[['B','/private/tmp/kb-terra-high-final8-20261108'],['TLQ','/private/tmp/kb-terra-high-final8-20261108'],['THQ','/private/tmp/kb-terra-high-final8-20261108'],['LEAN','/private/tmp/kb-reading-fixes-part2']];let n=0;
for(const f of (await fs.readdir(P)).sort()){const scene=path.basename(f,'.json'),task=JSON.parse(await fs.readFile(P+'/'+f,'utf8'));
 for(const [arm,dir] of arms)for(const rep of [1,2]){const a=JSON.parse(await fs.readFile(`${dir}/${scene}-${arm}-r${rep}.json`,'utf8')),c=collectPersistedRecords(a.productProjection.result,task.definition.nativeBridge??null);await fs.writeFile(`${out}/${scene}-${arm}-r${rep}.saved.json`,JSON.stringify(c.records),{mode:0o600});n++;}}
console.log(JSON.stringify({collected:n}));
