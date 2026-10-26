export function genericDraftConflict(base:string,incoming:unknown,dirty:boolean){return dirty&&base!==JSON.stringify(incoming);}

import type {FieldDefinition,Session} from '../shared/types';
export function preferredPublicBoard(fields:FieldDefinition[],session:Session,key:string,ownerId?:string){return fields.find(f=>f.key===key)??fields.find(f=>{const value=session.assertions.filter(a=>a.field===f.key&&a.ownerId===ownerId&&a.status==='accepted').at(-1)?.value;return !!value&&typeof value==='object'&&!Array.isArray(value)&&Array.isArray(value.pieces)&&value.pieces.length>0;})??fields[0];}
