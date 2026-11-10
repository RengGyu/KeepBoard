import {createApp as productApp} from '../../server/index';
import {builtinPacks} from '../../gamepacks/catalog';
/** Synthetic approved fixtures exercise reading after admission. This is NOT the shipped release roster.
 * Production-policy/default-photo rejection is covered using the real createApp in release-photo-save.
 */
export function createApp(options:Parameters<typeof productApp>[0]={}){
 return productApp({...options,runtimePacks:(options.runtimePacks??builtinPacks()).map(pack=>({...pack,releaseTier:'drawing' as const}))});
}
