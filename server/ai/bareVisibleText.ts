/** Called only after JSON.parse fails for an observed text property. No value coercion. */
export function bareVisibleText(source:string):string|undefined{
 const trimmed=source.trim();
 if(!trimmed||/^[\[\]{}"'`]/.test(trimmed))return undefined;
 // Do not turn damaged JSON literals or numeric encodings into printed-text facts.
 const lower=trimmed.toLowerCase();
 if(['null','true','false','undefined','nan','infinity'].some(literal=>literal.startsWith(lower)))return undefined;
 if(/^(?:[+-]?\d+(?:\.\d*)?(?:[eE][+-]?\d*)?|[+-]?\.\d+(?:[eE][+-]?\d*)?|[+.-])$/.test(trimmed))return undefined;
 return source;
}
