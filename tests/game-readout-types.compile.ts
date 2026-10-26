// Compiled by tools/readouts/typecheck-core.mjs. No runtime component mocks.
import type {ReadoutByGameId} from '../shared/readouts/generated-types';
export function inspectCarcassonne(x:ReadoutByGameId['carcassonne']){
 if(x.kind==='tiles'){
  const count:number|null=x.values.shields;
  // @ts-expect-error a Carcassonne tile does not become a dice form
  x.values.dieValue;
  return count;
 }
 if(x.kind==='followers'){
  const posture:'standing'|'lying'|null=x.values.posture;return posture;
 }
 return null;
}
export function roles(x:ReadoutByGameId['seti']){
 if(x.kind==='probes'){
  const role:'probe'|'orbiter'|'lander'|null=x.values.role;
  // @ts-expect-error roles cannot be made-up strings
  x.values.role='invented';return role;
 }
 return null;
}
