// Only this accessor reads the explicitly provided credential file. Never log it.
import fs from 'node:fs/promises';
export async function suppliedOpenAIKey(){
 const file=process.env.KEEPBOARD_OPENAI_API_KEY_FILE;
 if(!file)throw new Error('Provided credential reference not configured');
 let value:unknown=(await fs.readFile(file,'utf8')).replace(/^\uFEFF/,'').trim();
 if((value as string).startsWith('{')){
  let parsed:any;try{parsed=JSON.parse(value as string);}catch{throw new Error('Provided credential format unsupported');}
  const keys=Object.keys(parsed??{});
  if(keys.length!==1||!['OPENAI_API_KEY','api_key','apiKey'].includes(keys[0]))throw new Error('Provided credential format unsupported');
  value=parsed[keys[0]];
 }else{
  const m=(value as string).match(/^(?:export\s+)?(?:OPENAI_API_KEY|OpenAI[ _-]*(?:API[ _-]*)?(?:key)?)\s*[:=\n]\s*([^\n]+)$/i);
  if(m)value=m[1].trim();
 }
 if(typeof value==='string'&&value.length>1&&['"',"'",'`'].includes(value[0])&&value.at(-1)===value[0])value=value.slice(1,-1);
 if(typeof value!=='string'||!/^sk-[A-Za-z0-9_-]{16,}$/.test(value))throw new Error('Provided credential format unsupported');
 return value;
}
