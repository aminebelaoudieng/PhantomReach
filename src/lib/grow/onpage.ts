import {loadBuffer} from "cheerio";
import type {CheckState} from "./model";
import {getPublicPage} from "./public-page";
export type OnPageCheck={label:string;state:CheckState;detail:string};
export type OnPageAudit={state:"measured"|"unavailable";pages:number;title:string|null;description:string|null;titleLength?:number;descriptionLength?:number;h1:string[];h2Count?:number;h3Count?:number;images:number;missingAlt:number;internalLinks:number;externalLinks:number;formCount:number;contactLinkCount:number;ctaCount:number;schemaTypes:string[];checks:OnPageCheck[]};
type Parsed=Omit<OnPageAudit,"state"|"pages"|"checks">&{links:string[];canonical:string|null;noindex:boolean;og:boolean;contentLength:number};
const normalize=(s:string)=>s.replace(/\s+/g," ").trim();
const short=(s:string,n=160)=>normalize(s).slice(0,n);
function unique<T>(v:T[]){return [...new Set(v)];}
export function parsePage(html:Buffer,url:string,contentType=""):Parsed{
 const charset=contentType.match(/charset\s*=\s*["\']?([\w-]+)/i)?.[1];
 const $=loadBuffer(html,{encoding:{defaultEncoding:"utf-8",...(charset?{transportLayerEncodingLabel:charset}:{})}});
 const meta=(name:string)=>normalize($("meta").filter((_,el)=>($(el).attr("name")||"").toLowerCase()===name).first().attr("content")||"");
 const titleRaw=normalize($("title").first().text());const title=short(titleRaw,180)||null;
 const descriptionRaw=meta("description");const description=short(descriptionRaw,240)||null;
 const headings=$("h1").map((_,el)=>short($(el).text(),110)).get().filter(Boolean).slice(0,12);
 const images=$("img");const missingAlt=images.filter((_,el)=>$(el).attr("alt")===undefined).length;
 const origin=new URL(url).origin;const internal:string[]=[],external:string[]=[];
 let contacts=0,ctas=0;
 $("a,button,input[type='submit']").each((_,el)=>{
  const text=normalize($(el).text()+" "+($(el).attr("aria-label")||"")+" "+($(el).attr("value")||""));
  const href=$(el).attr("href")||"";if(/^(tel:|mailto:)/i.test(href))contacts++;
  if(/soumission|devis|estimation|contact|rendez.vous|réserv|appel|quote|book|estimate|request|schedule/i.test(text+" "+href))ctas++;
  if(!href||href.startsWith("#"))return;
  try{const u=new URL(href,url);if(!["http:","https:"].includes(u.protocol)||u.username||u.password)return;u.hash="";if(u.origin===origin){internal.push(u.href);}else external.push(u.href);}catch{}
 });
 const types:string[]=[];
 function walk(v:unknown,depth=0){if(depth>8||types.length>50||!v||typeof v!=="object")return;if(Array.isArray(v)){v.slice(0,40).forEach(x=>walk(x,depth+1));return;}const o=v as Record<string,unknown>;const t=o["@type"];for(const name of Array.isArray(t)?t:[t])if(typeof name==="string"&&/^[\w:/.-]{1,90}$/.test(name))types.push(name.split("/").pop()||name);if(o["@graph"])walk(o["@graph"],depth+1);}
 $("script[type='application/ld+json']").slice(0,20).each((_,el)=>{try{walk(JSON.parse($(el).text().slice(0,100000)));}catch{}});
 const canonical=$("link[rel='canonical']").first().attr("href")||null;
 const og=!!$("meta[property='og:title']").attr("content");
 const noindex=/\bnoindex\b/i.test(meta("robots")+" "+meta("googlebot"));
 const formCount=$("form").length;
 $("script,style,template,noscript,svg,head").remove();
 return {title,description,titleLength:titleRaw.length,descriptionLength:descriptionRaw.length,h1:headings,h2Count:$("h2").length,h3Count:$("h3").length,images:images.length,missingAlt,internalLinks:unique(internal).length,externalLinks:unique(external).length,formCount,contactLinkCount:contacts,ctaCount:ctas,schemaTypes:unique(types).slice(0,12),links:unique(internal),canonical:canonical?short(canonical,180):null,noindex,og,contentLength:normalize($("body").text()).length};
}
export function pageChecks(p:Parsed):OnPageCheck[]{
 const c=(label:string,state:CheckState,detail:string):OnPageCheck=>({label,state,detail});
 const evidence=p.contentLength>=100;
 const conversion=p.formCount+p.contactLinkCount+p.ctaCount;
 return [
  c("Titre SEO",p.title&&(p.titleLength??p.title.length)<=65?"ok":"improve",p.title?(p.titleLength??p.title.length)+" caractères. "+p.title:"Aucun titre HTML détecté."),
  c("Méta-description",p.description&&(p.descriptionLength??p.description.length)<=170?"ok":"improve",p.description?(p.descriptionLength??p.description.length)+" caractères. "+p.description:"Aucune méta-description détectée."),
  c("Structure des titres",p.h1.length?"ok":evidence?"improve":"unknown",p.h1.length?p.h1.length+" H1 · "+(p.h2Count??0)+" H2 · "+(p.h3Count??0)+" H3. "+p.h1[0]:"Aucun H1 visible dans le HTML initial."),
  c("Textes alternatifs",p.images?p.missingAlt?"improve":"ok":"unknown",p.images?p.missingAlt+" / "+p.images+" images sans attribut alt.":"Aucune image HTML détectée."),
  c("Indexation",p.noindex?"improve":"ok",p.noindex?"Directive noindex détectée.":"Aucun noindex dans les balises meta (indexation réelle non vérifiée)."),
  c("Moyens de contact",conversion?"ok":"unknown",conversion?p.formCount+" formulaire(s), "+p.contactLinkCount+" lien(s) tel/mail, "+p.ctaCount+" appel(s) à l'action détecté(s).":"Non détectés dans le HTML initial. Vérifier visuellement."),
  c("Données structurées",p.schemaTypes.length?"ok":"unknown",p.schemaTypes.length?p.schemaTypes.join(", "):"Aucun type JSON-LD valide détecté."),
  c("Lien canonique",p.canonical?"ok":"unknown",p.canonical||"Aucune balise canonique détectée."),
  c("Partage social",p.og?"ok":"unknown",p.og?"Titre Open Graph détecté.":"Titre Open Graph non détecté."),
  c("Liens internes",p.internalLinks?"ok":"unknown",p.internalLinks+" liens internes et "+p.externalLinks+" liens externes distincts.")
 ];
}
const empty=():OnPageAudit=>({state:"unavailable",pages:0,title:null,description:null,h1:[],images:0,missingAlt:0,internalLinks:0,externalLinks:0,formCount:0,contactLinkCount:0,ctaCount:0,schemaTypes:[],checks:[]});
// Conservative robots policy: any matching Disallow is respected, even if a different agent is listed.
function blocked(path:string,robots:string){return robots.split(/\r?\n/).some(line=>{const m=line.replace(/#.*$/,"").match(/^\s*disallow\s*:\s*(.*?)\s*$/i);if(!m?.[1])return false;const s=m[1];if(s.includes("*")||s.includes("$"))return true;return path.startsWith(s);});}
export async function auditOnPage(url:string):Promise<OnPageAudit>{
 const deadline=Date.now()+16000;
 try{
  const initial=new URL(url);
  const robots=await getPublicPage(new URL("/robots.txt",initial).href,deadline,200000).catch(()=>null);
  const robotsText=robots?.status===200&&robots.type.includes("text/plain")?robots.body.toString("utf8"):"";
  if(robotsText&&blocked(initial.pathname,robotsText))return empty();
  const res=await getPublicPage(url,deadline);
  if(res.status!==200||!/(text\/html|application\/xhtml\+xml)/.test(res.type))return empty();
  const parsed=parsePage(res.body,res.url,res.type);
  const {links,canonical,noindex,og,contentLength,...data}=parsed;
  const checks=pageChecks(parsed);
  const sameOrigin=new URL(res.url).origin===initial.origin;
  const safeCrawl=sameOrigin&&(robots?.status===404||robots?.status===200&&robots.type.includes("text/plain"));
  const candidates=safeCrawl?links.filter(l=>{const u=new URL(l);return u.pathname!==new URL(res.url).pathname&&!u.search&&!/\.[a-z0-9]{2,5}$/i.test(u.pathname)&&/service|contact|soumission|about|apropos|a-propos|devis|quote/i.test(u.pathname)&&!blocked(u.pathname,robotsText);}).slice(0,2):[];
  const results=await Promise.all(candidates.map(async l=>{try{const p=await getPublicPage(l,deadline);if(p.status!==200||!p.type.includes("text/html")||new URL(p.url).origin!==initial.origin)return null;return {url:p.url,page:parsePage(p.body,p.url,p.type)};}catch{return null;}}));
  const sample=[{url:res.url,page:parsed},...results.filter((x):x is {url:string;page:Parsed}=>x!==null)];
  const pages=unique(sample.map(x=>x.url)).length;
  if(pages>1){const uniquePages=[...new Map(sample.map(x=>[x.url,x.page])).values()];const titles=uniquePages.map(x=>x.title?.toLowerCase()).filter(Boolean), descriptions=uniquePages.map(x=>x.description?.toLowerCase()).filter(Boolean);const duplicates=titles.length-new Set(titles).size+descriptions.length-new Set(descriptions).size;checks.push({label:"Titres / descriptions dupliqués",state:duplicates?"improve":"ok",detail:duplicates?duplicates+" doublon(s) dans "+pages+" pages échantillonnées.":"Aucun doublon détecté sur "+pages+" pages échantillonnées."});}
  checks.push({label:"Robots.txt",state:robots?.status===200&&robots.type.includes("text/plain")?"ok":"unknown",detail:robots?.status===200&&robots.type.includes("text/plain")?"Fichier texte accessible.":robots?.status===404?"Fichier non trouvé (non obligatoire).":"Non vérifié."});
  if(safeCrawl&&deadline-Date.now()>1800){const sitemap=await getPublicPage(new URL("/sitemap.xml",res.url).href,deadline,300000).catch(()=>null);const found=sitemap?.status===200&&/<(?:urlset|sitemapindex)\b/i.test(sitemap.body.toString("utf8",0,2000));checks.push({label:"Sitemap XML",state:found?"ok":"unknown",detail:found?"Sitemap XML détecté.":"Sitemap standard non confirmé (peut exister à une autre adresse)."});}
  return {state:"measured",pages,...data,checks};
 }catch{return empty();}
}
