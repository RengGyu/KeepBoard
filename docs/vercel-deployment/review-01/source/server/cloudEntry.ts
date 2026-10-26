import {start} from 'workflow/api';
import {analyzeWorkflow} from '../workflows/analyze.ts';
import {cloudRuntime} from './cloudRuntime.ts';import {createApp} from './index.ts';
const {store,objects}=cloudRuntime();
export default await createApp({store,cloud:{objects,dispatch:async id=>{await start(analyzeWorkflow,[id]);}}});
