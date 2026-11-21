import {getProviderSecret} from "@/lib/config/provider-config";
import type {GrowAudit} from "./model";
import {planNarrative,narrativePayload,type NarrativeTopic} from "./narrative-policy";
export type GrowNarrative=Partial<Record<"reviews"|"maps"|"ai"|"website",string>>;
export type NarrativeUsage={status:"not_needed"|"disabled"|"missing_key"|"unavailable"|"generated";topics:NarrativeTopic[];attempted:boolean;model?:string;inputTokens?:number;outputTokens?:number;thoughtTokens?:number;totalTokens?:number};
type NarrativeResult={narrative?:GrowNarrative;usage:NarrativeUsage};
const allKeys=["reviews","maps","ai","website"] as const;
export function sanitizeNarrative(value:unknown,allowed:readonly string[]=allKeys):GrowNarrative{
 if(!value||typeof value!=="object"||Array.isArray(value))return {};
 const out:GrowNarrative={};
 for(const k of allKeys){
  if(!allowed.includes(k))continue;
  const text=(value as Record<string,unknown>)[k];if(typeof text!=="string")continue;
  const s=text.replace(/\s+/g," ").trim();
  if(s.length>=35&&s.length<=220&&!/\d|https?:|[<>#{}]|garanti|certainement|assurément|vous gagnerez|vous perdrez/i.test(s))out[k]=s;
 }
 return out;
}
function tokens(n:unknown):number|undefined{return typeof n==="number"&&Number.isSafeInteger(n)&&n>=0?n:undefined;}
export async function generateGrowNarrative(a:GrowAudit):Promise<NarrativeResult>{
 const facts=planNarrative(a),topics=Object.keys(facts) as NarrativeTopic[];
 const usage:NarrativeUsage={status:"not_needed",topics,attempted:false};
 if(!topics.length)return {usage};
 if(process.env.GROW_GEMINI_NARRATIVE==="off")return {usage:{...usage,status:"disabled"}};
 try{
  const key=await getProviderSecret("google_ai_api_key");if(!key)return {usage:{...usage,status:"missing_key"}};
  // Lock the economical model; optional explicitly supported 3.x Flash-Lite override only.
  const model=process.env.GROW_GEMINI_MODEL==="gemini-3.5-flash-lite"?"gemini-3.5-flash-lite":"gemini-3.1-flash-lite";
  usage.model=model;
  const payload=narrativePayload(facts),body=JSON.stringify(payload);
  // Input bound in bytes, not a claim about exact tokenizer billing. No countTokens call.
  if(Buffer.byteLength(body,"utf8")>2600)return {usage:{...usage,status:"unavailable"}};
  usage.attempted=true;
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},signal:AbortSignal.timeout(12000),cache:"no-store",body});
  if(!response.ok){console.warn("[grow/gemini] HTTP",response.status);return {usage:{...usage,status:"unavailable"}};}
  const data=await response.json();const u=data.usageMetadata;
  usage.inputTokens=tokens(u?.promptTokenCount);usage.outputTokens=tokens(u?.candidatesTokenCount);usage.thoughtTokens=tokens(u?.thoughtsTokenCount);usage.totalTokens=tokens(u?.totalTokenCount);
  // No retries, no automatic escalation, no web grounding or tool calls.
  const c=data.candidates?.[0];
  const text=(c?.content?.parts||[]).filter((p:{thought?:boolean;text?:string})=>!p.thought&&typeof p.text==="string").map((p:{text:string})=>p.text).join("");
  const narrative=c?.finishReason==="MAX_TOKENS"?{}:sanitizeNarrative(JSON.parse(text),topics);
  usage.status=Object.keys(narrative).length?"generated":"unavailable";
  console.info("[grow/gemini] usage",JSON.stringify(usage));
  return {narrative:usage.status==="generated"?narrative:undefined,usage};
 }catch(e){usage.status="unavailable";console.warn("[grow/gemini] unavailable",e instanceof Error?e.name:"unknown",JSON.stringify(usage));return {usage};}
}
