import type {GrowAudit,CheckState} from "./model";
export type Signal="red"|"amber"|"good"|"neutral";
export const signalLabel:Record<Signal,string>={red:"Prioritaire",amber:"À renforcer",good:"Point fort",neutral:"À vérifier"};
export function level(n:number|null,redBelow:number,goodFrom:number):Signal{return n===null||!Number.isFinite(n)?"neutral":n<redBelow?"red":n<goodFrom?"amber":"good";}
export function checkLevel(s:CheckState,label:string):Signal{return s==="ok"?"good":s==="unknown"?"neutral":/site relié|indexation|indexabilité|https/i.test(label)?"red":"amber";}
export function commercialKeyword(category:string,title:string|null,h1:string[],state:string,custom?:string){
 if(custom?.trim())return {keyword:custom.trim().slice(0,100),source:"Mot-clé choisi"}; 
 const english=!/^(qc|qu[eé]bec)$/i.test(state.trim())&&/\b(waterproofing|drain|cleaning|plumbing|roofing|electrical|heating|renovation|construction services)\b/i.test([title,...h1].join(" "));
 const evidence=[title,...h1].join(" ");
 const generic=/construction|contractor|entrepreneur|services|service|company|entreprise/i.test(category);
 const patterns:[RegExp,string,string][]=[
 [/\b(?:basement\s+)?waterproofing\b|imperm[ée]abilisation/i,"basement waterproofing","imperméabilisation de fondation"],
 [/\bdrain(?:age| repair| services)?\b|drainage/i,"drain repair","service de drainage"],
 [/\bcleaning\b|entretien m[ée]nager|nettoyage/i,"house cleaning","service de nettoyage"],
 [/\bplumbing\b|plomberie/i,"plumbing services","service de plomberie"],
 [/\broofing\b|toiture/i,"roofing contractor","couvreur"],
 [/\belectrical\b|[ée]lectricien/i,"electrician","électricien"],
 [/\bHVAC\b|chauffage|climatisation/i,"HVAC services","chauffage et climatisation"]];
 if(generic){for(const [re,en,fr] of patterns){if(re.test(evidence))return {keyword:english?en:fr,source:"Service repéré sur le site (à valider)"};}}
 return {keyword:category.slice(0,100),source:"Catégorie Google (à valider)"};
}
// Only explicit labelled/bold names; candidates are excerpts, never verified businesses.
export function citedNames(text:string,own:string):string[]{
 const names=new Map<string,string>();
 const add=(raw:string)=>{const n=raw.replace(/^[\s*#\d.)\-–•]+/,"").replace(/\*+/g,"").trim();if(n.length<4||n.length>75||n.split(/\s+/).length>8||!/[A-ZÀ-Ý]/.test(n)||/https?:|[!?]|^(?:construction commerciale|construction résidentielle|entreprises|conseils|sources|commercial|residential|industrial|note|services|voici|conclusion|recommended|local|recommendations|options)/i.test(n))return;
 const key=n.toLowerCase();if(key!==own.toLowerCase()&&!key.includes(own.toLowerCase())&&!own.toLowerCase().includes(key))names.set(key,n);};
 for(const m of text.matchAll(/(?:^|\n| \* )\s*(?:[-*•]|\d+[.)])?\s*\*\*([^*\n]{4,75})\*\*\s*(?:[:–—-]|$)/gm))add(m[1]);
 for(const m of text.matchAll(/(?:^|\n| \* )\s*(?:[-*•]|\d+[.)])?\s*([A-ZÀ-Ý][^:\n*]{3,74}):\s+(?=[A-ZÀ-Ý])/gm))add(m[1]);
 return [...names.values()].slice(0,8);
}
export function actionSignal(a:GrowAudit,category:string,top:number|null,response:number|null,reviewRatio:number|null):Signal{
 switch(category){
 case "SITE WEB":return a.website.state==="not_linked"||a.website.performance!==null&&a.website.performance<50?"red":"amber";
 case "AVIS":return response===0?"red":reviewRatio!==null&&reviewRatio<50?"amber":"amber";
 case "GOOGLE MAPS":return level(top,25,65);
 case "FICHE GOOGLE":return a.checks.some(c=>c.state==="improve")?"amber":"neutral";
 case "VISIBILITÉ IA":return a.ai.some(x=>x.state!=="unknown")&&a.ai.every(x=>x.state!=="mentioned")?"red":"amber";
 default:return "neutral";
 }
}
export function deliverable(category:string,a:GrowAudit){
 switch(category){
 case "AVIS":return "Réponses aux avis existants et automatisation des invitations à tous les clients.";
 case "GOOGLE MAPS":return "Optimisation de la fiche, pages locales et suivi des positions sur la même grille.";
 case "FICHE GOOGLE":return "Vérification des champs, catégories, services et contenu avec votre accord.";
 case "SITE WEB":return a.website.url?"Optimisation du site existant, des formulaires et du suivi CRM.":"Vérification du site éventuel, puis création ou raccordement et formulaire CRM.";
 case "VISIBILITÉ IA":return "Services et zones clairement décrits, profils cohérents et suivi des mentions.";
 default:return "CRM, mesure des demandes et suivi des conversions avec rapport mensuel.";
 }
}
