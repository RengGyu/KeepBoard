import type { Server } from 'node:http';
export class GatewayError extends Error { code:string; status:number; diagnostics:Record<string,unknown>; constructor(code:string,status?:number,diagnostics?:Record<string,unknown>); }
export function validateConfig(config:unknown):any;
export function finalJSON(payload:unknown,kind:string):{data:unknown;textLength:number};
export function createGateway(options:{configFile:string;onDiagnostic?:(entry:Record<string,any>)=>void;endpointOverride?:(kind:string,model:string)=>string}):Server;
export function startGateway(configFile?:string):Promise<Server>;

export function hostedJSON(prompt:string,images:{mimeType:string;data:string}[]):Promise<unknown>;
