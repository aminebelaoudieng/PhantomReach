import { cleanLocation } from "./location";
import type { AuditInput, AuditResult, ReportScores } from "@/lib/db/types";
import { getProviderSecret } from "@/lib/config/provider-config";
import { fetchGoogleReviews } from "@/lib/agents/tools/reviews";
import { lookupGoogleMaps } from "@/lib/agents/tools/google-maps";
import { runPageSpeedAudit } from "@/lib/agents/tools/pagespeed";
import { assertPublicHttpUrl } from "@/lib/security/public-http-url";
import { scoreChecks, summarizeGrid, type GrowAudit, type Point, type Competitor, type Check, type AIAnswer } from "./model";

type Place = { title?:string; place_id?:string; cid?:string; fid?:string; address?:string; latitude?:number; longitude?:number; rating?:number; rating_count?:number; type?:string; types?:string[]; website?:string; phone_number?:string; international_phone_number?:string; opening_hours?:Record<string,string>; description?:string; photos?:unknown[]; position?:number; google_maps_url?:string };
type Review = {rating?:number; iso_date?:string; response?:{snippet?:string}};
type Envelope = {results?:unknown[]; meta?:{parse_quality?:string}; text?:string; mentions?:{term?:string;mentioned?:boolean}[]; sources?:{domain?:string;cited?:boolean}[]};
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const number=(v:unknown):number|null=>typeof v==="number"&&Number.isFinite(v)?v:null;
const same=(a:Place,b:Place)=>!!((a.place_id&&b.place_id&&a.place_id===b.place_id)||(a.cid&&b.cid&&String(a.cid)===String(b.cid))||(a.fid&&b.fid&&a.fid===b.fid));
const idFor=(p:Place)=>p.place_id?{place_id:p.place_id}:p.cid?{cid:p.cid}:p.fid?{fid:p.fid}:null;
const formatDate=(d:string)=>new Date(d).toISOString().slice(0,10);
const safeName=(s:unknown)=>typeof s==="string"?s.trim().slice(0,150):"";
const grade=(n:number|null)=>n===null?"N/D":n>=90?"A":n>=80?"B":n>=70?"C":n>=60?"D":"F";

export async function runGrowAudit(input:AuditInput):Promise<{result:AuditResult;scores:ReportScores}> {
  input={...input,...cleanLocation(input.city,input.state)};
  const key=(await getProviderSecret("serpkite_api_key"))?.trim();
  const country=(process.env.GROW_COUNTRY||"ca").toLowerCase();
  const location=[input.city,input.state,country==="ca"?"Canada":country==="us"?"United States":""].filter(Boolean).join(", ");
  const notes:string[]=[];
  let p:Place={}, profileFound=false, source="Non mesuré", detailed=false;
  let creditsLeft=Number(process.env.GROW_MAX_SERPKITE_CREDITS||"45");
  if(!Number.isFinite(creditsLeft)) creditsLeft=45;
  creditsLeft=Math.max(0,Math.min(60,Math.floor(creditsLeft)));
  let exhausted=false;
  async function call(endpoint:string, params:Record<string,unknown>, maxCost=1):Promise<Envelope|null> {
    if(!key||exhausted||creditsLeft<maxCost)return null;
    creditsLeft-=maxCost;
    try {
      const res=await fetch("https://api.serpkite.com/v1/"+endpoint,{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({country,...(endpoint==="chatgpt"?{}:{language:"fr"}),...params}),signal:AbortSignal.timeout(endpoint==="maps"?12000:40000),cache:"no-store"});
      if(!res.ok){console.warn("[grow/serpkite]",endpoint,"http",res.status,"request",res.headers.get("x-request-id")||"n/a");if([401,402,403,429].includes(res.status))exhausted=true;return null;}
      const data=await res.json() as Envelope;
      console.info("[grow/serpkite]",endpoint,"quality",data?.meta?.parse_quality??"unknown","results",Array.isArray(data?.results)?data.results.length:"n/a","request",res.headers.get("x-request-id")||"n/a");
      return data&&typeof data==="object"?data:null;
    } catch(error){console.warn("[grow/serpkite]",endpoint,"failed",error instanceof Error?error.name:"unknown");return null;}
  }
  const searchName=input.businessName.trim();
  let targetId:string|undefined=input.placeId;
  if(input.googleMapsUrl)try{const u=new URL(input.googleMapsUrl);targetId=targetId||u.searchParams.get("query_place_id")||u.searchParams.get("place_id")||undefined;}catch{}
  if(key){
    // Prefer the selected Google identifier. This avoids guessing an exact name or location.
    if(targetId){
      const d=await call("place",{place_id:targetId});
      const item=(d?.results as Place[]|undefined)?.[0];
      if(item?.title&&item.place_id===targetId){p=item;profileFound=true;source="SerpKite / Google Maps";detailed=d?.meta?.parse_quality==="ok";}
    }
    if(!profileFound){
      const match=await call("maps",{q:[searchName,input.city,input.state].filter(Boolean).join(" "),location});
      const candidates=Array.isArray(match?.results)?match.results as Place[]:[];
      const matches=candidates.filter(c=>targetId?c.place_id===targetId:normalize(c.title||"")===normalize(searchName)&&(!input.city||normalize(c.address||"").includes(normalize(input.city))));
      if(matches.length===1&&idFor(matches[0])){
        p=matches[0]; profileFound=true; source="SerpKite / Google Maps";
        const details=await call("place",idFor(p)!);
        const item=(details?.results as Place[]|undefined)?.[0];
        if(item&&same(item,p)){p={...p,...item};detailed=details?.meta?.parse_quality==="ok";}
      }else{console.warn("[grow] SerpKite target not matched; candidates:",candidates.length,"matches:",matches.length);notes.push("Fiche non identifiée sans ambiguïté par la recherche SerpKite.");}
    }
  } else notes.push("SerpKite non configuré : grille et tests IA non mesurés.");
  if(!profileFound){
    const fallback=await lookupGoogleMaps({...input,placeId:targetId});
    if("raw" in fallback&&(targetId?fallback.raw.place_id===targetId:normalize(fallback.raw.title)===normalize(searchName)&&(!input.city||normalize(fallback.raw.address||"").includes(normalize(input.city))))){
      const r=fallback.raw;
      p={title:r.title,place_id:r.place_id,address:r.address,phone_number:r.phone,website:r.website,type:r.category,rating:r.rating,rating_count:r.reviews,opening_hours:r.operating_hours,latitude:r.gps_coordinates?.latitude,longitude:r.gps_coordinates?.longitude};
      profileFound=true;source="Google Places";
      if(key&&p.place_id){const d=await call("place",{place_id:p.place_id});const item=(d?.results as Place[]|undefined)?.[0];if(item&&same(item,p)){p={...p,...item};detailed=d?.meta?.parse_quality==="ok";source="Google Places + SerpKite";}}
    } else console.warn("[grow] Google Places fallback failed or did not match target");
  }
  if(!profileFound)throw new Error("Fiche Google non identifiée. Sélectionnez l'entreprise dans les suggestions et vérifiez la ville.");
  console.info("[grow] Profile matched",source,"coordinates",number(p.latitude)!==null&&number(p.longitude)!==null);
  const keyword=(input.customDirection?.trim()||p.type||"").slice(0,100);
  const fields: {title:string;value?:string;action:string}[]=[
    {title:"Nom commercial",value:p.title,action:"Vérifier le nom commercial exact."},
    {title:"Adresse ou secteur",value:p.address,action:"Préciser votre zone de service si applicable."},
    {title:"Téléphone",value:p.international_phone_number||p.phone_number,action:"Vérifier que le numéro est accessible aux clients."},
    {title:"Site relié",value:p.website,action:"Vérifier le lien vers votre site."},
    {title:"Catégorie principale",value:p.type,action:"Choisir la catégorie qui décrit précisément vos services."},
    {title:"Catégories secondaires",value:p.types?.filter(x=>x!==p.type).join(", "),action:"Vérifier les autres catégories pertinentes."},
    {title:"Horaires",value:p.opening_hours&&Object.keys(p.opening_hours).length?"Renseignés":undefined,action:"Vérifier les horaires et les jours fériés."},
    {title:"Description",value:source.includes("SerpKite")?p.description:undefined,action:"Vérifier et compléter la description de la fiche."},
    {title:"Photos visibles",value:p.photos?.length?String(p.photos.length)+" observées":undefined,action:"Ajouter des photos récentes de vos réalisations."},
    {title:"Publications",action:"Vérifier les publications dans votre fiche."},
    {title:"Services et attributs",action:"Vérifier les services et attributs directement sur la fiche."}
  ];
  const checks:Check[]=fields.map(f=>({title:f.title,value:f.value?safeName(f.value):"Non observé",state:f.value?"ok":"unknown",action:!f.value?f.action:undefined}));
  // A missing response field is not proof of absence. Only evaluate confirmed signals.
  if(profileFound&&detailed&&!p.website){const c=checks[3];c.state="improve";c.value="Aucun lien observé";}
  const {score,coverage}=scoreChecks(checks);
  const reviewPromise=profileFound&&key&&idFor(p)?call("reviews",{...idFor(p)!,num:10,sort:"most_relevant"}):Promise.resolve(null);
  const grid:Point[]=[];
  const competitors:Competitor[]=[];
  const lat=number(p.latitude),lng=number(p.longitude),spacingKm=0.7;
  if(profileFound&&idFor(p)&&lat!==null&&lng!==null&&keyword&&Math.abs(lat)<85){
    const size=process.env.GROW_GRID_SIZE==="3"?3:5, mid=(size-1)/2;
    const coords=Array.from({length:size*size},(_,i)=>({lat:lat+(mid-Math.floor(i/size))*spacingKm/111.32,lng:lng+(i%size-mid)*spacingKm/(111.32*Math.cos(lat*Math.PI/180))}));
    // Bounded parallelism; center first so competitor evidence survives a partial run.
    const order=[Math.floor(coords.length/2),...coords.map((_,i)=>i).filter(i=>i!==Math.floor(coords.length/2))];
    const results:Point[]=coords.map(c=>({...c,rank:null,state:"unknown",depth:0}));
    for(let i=0;i<order.length;i+=3)await Promise.all(order.slice(i,i+3).map(async index=>{
      const c=coords[index], e=await call("maps",{q:keyword,ll:"@"+c.lat.toFixed(6)+","+c.lng.toFixed(6)+",15z"});
      const list=(e?.results??[]) as Place[];
      const found=list.find(v=>same(v,p)), rank=number(found?.position);
      const complete=e?.meta?.parse_quality==="ok"&&list.length>0;
      results[index]={...c,rank:rank&&rank>0?rank:null,state:rank&&rank>0?"found":complete&&!found&&list.every(v=>!!idFor(v))?"outside":"unknown",depth:list.length};
      if(index===Math.floor(coords.length/2))for(const v of list.filter(v=>!same(v,p)&&v.title).slice(0,4))competitors.push({name:safeName(v.title),rating:number(v.rating),reviews:number(v.rating_count),rank:number(v.position),website:v.website?true:null});
    }));
    grid.push(...results);
  }
  const reviewData=await reviewPromise;
  let rawReviews=(reviewData?.results??[]) as Review[];
  let reviewSource: "serpkite" | "google" | "none" = reviewData && Array.isArray(reviewData.results) ? "serpkite" : "none";
  if(reviewSource==="none"&&profileFound&&p.place_id){const fallback=await fetchGoogleReviews({placeId:p.place_id,businessName:searchName,city:input.city});if("reviews" in fallback){rawReviews=fallback.reviews.map(r=>({rating:r.rating,iso_date:r.date}));reviewSource="google";}}
  const rated=rawReviews.filter(r=>number(r.rating)!==null&&Number.isInteger(r.rating)&&r.rating!>=1&&r.rating!<=5);
  const dates=rawReviews.map(r=>r.iso_date).filter((d):d is string=>typeof d==="string"&&Number.isFinite(Date.parse(d))&&Date.parse(d)<=Date.now()).sort((a,b)=>Date.parse(b)-Date.parse(a));
  const reviewSample={count:rawReviews.length,rated:rated.length,replied:reviewSource==="serpkite"&&reviewData?.meta?.parse_quality==="ok"&&rawReviews.length?rawReviews.filter(r=>!!r.response?.snippet).length:null,stars:[5,4,3,2,1].map(n=>rated.filter(r=>r.rating===n).length),newestObserved:dates.length?formatDate(dates[0]):null,source:reviewSource};
  const engines=[["chatgpt","ChatGPT",5],["gemini","Gemini",5],["ai_mode","Google AI Mode",3]] as const;
  const ai:AIAnswer[]=await Promise.all(engines.map(async ([endpoint,engine,cost]):Promise<AIAnswer>=>{
    const e=profileFound&&keyword&&location&&process.env.GROW_AI_VISIBILITY!=="off"?await call(endpoint,{prompt:"Quels prestataires de "+keyword+" recommandez-vous à "+location+" ? Donnez des entreprises locales réelles.",track:[p.title!,...competitors.map(c=>c.name)]},cost):null;
    const mention=e?.mentions?.find(m=>normalize(m.term||"")===normalize(p.title||""));
    return {engine,state:e?.text&&typeof mention?.mentioned==="boolean"?(mention.mentioned?"mentioned":"absent"):"unknown",sources:[...new Set((e?.sources??[]).filter(s=>s.cited&&s.domain).map(s=>s.domain!))].slice(0,3),competitors:(e?.mentions??[]).filter(m=>m.mentioned&&competitors.some(c=>normalize(c.name)===normalize(m.term||""))).map(m=>safeName(m.term)).slice(0,3)};
  }));
  const websiteUrl=input.url||p.website||null;
  let performance:number|null=null,seo:number|null=null;
  if(websiteUrl)try{await assertPublicHttpUrl(websiteUrl);const psi=await runPageSpeedAudit({url:websiteUrl});if("analysis" in psi){performance=psi.analysis.performance_score;seo=psi.analysis.seo_score;}}catch{}
  const website:GrowAudit["website"]={url:websiteUrl,performance,seo,state:p.website?"linked":profileFound&&detailed?"not_linked":"unknown"};
  const priorities:GrowAudit["priorities"]=[];
  if(website.state==="not_linked")priorities.push({title:"Relier un site à votre fiche",detail:"Présenter vos prestations et proposer une demande de soumission simple."});
  if(number(p.rating_count)!==null&&competitors.some(c=>c.reviews!==null&&c.reviews>p.rating_count!))priorities.push({title:"Développer votre réputation",detail:"Inviter tous vos clients à partager un avis honnête après une prestation, sans sélectionner seulement les clients satisfaits."});
  if(reviewSample.replied!==null&&reviewSample.replied<reviewSample.count)priorities.push({title:"Répondre aux avis observés",detail:"Répondre de manière personnalisée et professionnelle aux avis sans réponse."});
  const stats=summarizeGrid(grid);
  console.info("[grow] coverage",coverage,"grid",stats.measured,"reviews",reviewSample.count,"competitors",competitors.length,"ai",ai.filter(x=>x.state!=="unknown").length);
  if(stats.measured&&stats.top3<stats.measured/2)priorities.push({title:"Renforcer la visibilité locale",detail:"Vérifier les catégories, services et zones desservies, puis répéter la même mesure géographique."});
  if(performance!==null&&performance<70)priorities.push({title:"Améliorer le site mobile",detail:"Réduire le temps de chargement et faciliter la prise de contact."});
  if(ai.some(x=>x.state==="absent"))priorities.push({title:"Renforcer les informations en ligne",detail:"Présenter les services et secteurs sur le site et les annuaires pertinents."});
  if(!priorities.length)priorities.push({title:"Confirmer et suivre la fiche",detail:profileFound?"Vérifier les champs non observables et refaire les mesures régulièrement.":"Confirmer l'identité de la fiche et relancer les mesures."});
  notes.push("Publications et historique complet des avis non disponibles avec cette source.");
  if(grid.some(x=>x.state==="unknown"))notes.push("Certains points n'ont pas été mesurés.");
  const grow:GrowAudit={version:2,name:p.title||searchName,location,date:new Date().toISOString().slice(0,10),keyword,source,profileFound,rating:number(p.rating),reviewCount:number(p.rating_count),checks,score,coverage,reviewSample,competitors,grid,spacingKm,ai,website,notes,priorities:priorities.slice(0,3)};
  return {result:{executive_summary:"Audit de visibilité locale",recommendations:[],grow},scores:{overall_grade:grade(score),overall_score:score??0,module_grades:{gbp_health:grade(score)}}};
}
