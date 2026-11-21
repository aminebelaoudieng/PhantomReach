import { getProviderSecret } from "@/lib/config/provider-config";
import { summarizeGrid,type GrowAudit } from "./model";
export type GrowNarrative=Partial<Record<"reviews"|"maps"|"ai"|"website",string>>;
const keys=["reviews","maps","ai","website"] as const;
export function sanitizeNarrative(value:unknown):GrowNarrative{
 if(!value||typeof value!=="object")return {};
 const out:GrowNarrative={};
 for(const k of keys){const text=(value as Record<string,unknown>)[k];if(typeof text!=="string")continue;
  const s=text.replace(/\s+/g," ").trim();
  // Numbers and URLs stay in deterministic report components, not generated commentary.
  if(s.length>=35&&s.length<=320&&!/\d|https?:|[<>#{}]|garanti|certainement|assurément/i.test(s))out[k]=s;
 }
 return out;
}
export async function generateGrowNarrative(a:GrowAudit):Promise<GrowNarrative|undefined>{
 if(process.env.GROW_GEMINI_NARRATIVE==="off")return;
 try{
  const key=await getProviderSecret("google_ai_api_key");if(!key)return;
  const model=process.env.GROW_GEMINI_MODEL||"gemini-3.1-flash-lite";
  if(!/^gemini-[a-z0-9.-]+$/.test(model))return;
  const grid=summarizeGrid(a.grid);
  const facts={reviews:{rating:a.rating,total:a.reviewCount,observed:a.reviewSample.count,replied:a.reviewSample.replied,competitorReviewCounts:a.competitors.map(c=>c.reviews)},maps:{measured:grid.measured,top3:grid.top3,found:grid.found},ai:{tested:a.ai.filter(x=>x.state!=="unknown").length,mentioned:a.ai.filter(x=>x.state==="mentioned").length},website:{linkState:a.website.state,hasKnownUrl:!!a.website.url,performance:a.website.performance,seo:a.website.seo,checks:a.website.details?.checks.map(c=>({label:c.label,state:c.state}))}};
  // No business names, URLs, reviewer names, raw reviews, contact data or prompts from external sites.
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},signal:AbortSignal.timeout(18000),body:JSON.stringify({systemInstruction:{parts:[{text:"Tu rédiges des commentaires pour un audit commercial local en français canadien. Pour chaque sujet, explique uniquement une conséquence plausible du constat connu et une action concrète. Deux phrases courtes, maximum 300 caractères par sujet, sans chiffre ni URL. Ne prétends pas connaître des données absentes. Aucun classement ou gain garanti, aucune affirmation factuelle non fournie. Ne déduis pas des leads du geogrid. Si les données sont insuffisantes, explique qu’une vérification est nécessaire. Distingue absence de lien et absence de site. Réponds uniquement en JSON."}]},contents:[{role:"user",parts:[{text:JSON.stringify(facts)}]}],generationConfig:{temperature:0.2,maxOutputTokens:1100,responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:Object.fromEntries(keys.map(k=>[k,{type:"STRING"}])),required:keys}}})});
  if(!response.ok){console.warn("[grow/gemini] HTTP",response.status);return;}
  const data=await response.json();const text=(data.candidates?.[0]?.content?.parts||[]).filter((p:{thought?:boolean;text?:string})=>!p.thought&&typeof p.text==="string").map((p:{text:string})=>p.text).join("");
  const parsed=sanitizeNarrative(JSON.parse(text));
  console.info("[grow/gemini] generated sections",Object.keys(parsed).length);
  return Object.keys(parsed).length?parsed:undefined;
 }catch(e){console.warn("[grow/gemini] unavailable",e instanceof Error?e.name:"unknown");}
}
