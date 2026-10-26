import {LocalReader} from '../../server/ai/localReader.ts';
const file=process.argv[2];if(!file)throw Error('Expected private reader config path');
const reader=await LocalReader.fromFile(file),capability=await reader.numeralCapability();
console.log(JSON.stringify({kind:'runtime-configuration-only',modelRequests:0,available:capability.available,profile:capability.profile,reason:capability.reason??null}));
if(!capability.available)process.exitCode=1;
