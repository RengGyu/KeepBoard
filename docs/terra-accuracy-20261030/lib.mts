// Shared request builders. Frozen inputs are read only; the only request deltas are named below.
import {withNamedBox,withNamedBoxPrompt} from '../ten-games-closeup-20261029/terra-fix/namedBox.mts';
export const MODEL='gpt-6.1-terra';
/** Field-filling delta (Quacks hypothesis): every listed property gets a row; same visible fact may fill two listed properties. Game-agnostic, no values. */
export const FILL_SENTENCE='For every returned object, include exactly one attribute row for each listed property of its kind; when a property is not visible use valueJson null with its reason, and when two listed properties describe the same visible fact, fill both.';
export function withFill(prompt:string){const anchor=' Include no manual properties.';if(prompt.split(anchor).length!==2)throw Error('fill anchor');return prompt.replace(anchor,' '+FILL_SENTENCE+anchor);}
/** Gemini game body -> Terra Responses body (same transport as terra-comparison/run.mts), then the named-box contract from terra-fix. */
export function terraNamedFromGemini(gemini:any,image?:{mimeType:string;data:string}){
 const parts=gemini.contents[0].parts,prompt=parts.find((x:any)=>typeof x.text==='string').text,img=image??parts.find((x:any)=>x.inlineData).inlineData;
 return {model:MODEL,store:false,service_tier:'default',max_output_tokens:32768,reasoning:{effort:'low'},
  input:[{role:'user',content:[{type:'input_text',text:withNamedBoxPrompt(prompt)},{type:'input_image',image_url:`data:${img.mimeType};base64,${img.data}`,detail:'high'}]}],
  text:{format:{type:'json_schema',name:'game_observation',strict:true,schema:withNamedBox(gemini.generationConfig.responseFormat.text.schema)}}};
}
export function applyFill(body:any){const b=structuredClone(body);b.input[0].content[0].text=withFill(b.input[0].content[0].text);return b;}
export function replaceImage(body:any,mimeType:string,data:string){const b=structuredClone(body);b.input[0].content[1].image_url=`data:${mimeType};base64,${data}`;return b;}
