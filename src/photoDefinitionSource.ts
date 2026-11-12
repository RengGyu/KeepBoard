// Node/non-Vite consumers retain the historical synchronous lookup/loading contract.
import {createPhotoDefinitionLoader} from './photoDefinitionLoader';
const loader=createPhotoDefinitionLoader(()=>import('../game-photo-definitions/index.json'),()=>import('../docs/gamepack-revision-20261026/history/before-runtime-revision/game-photo-definitions/index.json'));
export const loadPhotoDefinitions=loader.load;
export const photoDefinitionFor=loader.find;
