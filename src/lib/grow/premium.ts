import {summarizeGrid, sections, opportunity, type GrowAudit} from "./model";
export const shortName=(s:string)=>s.split(" | ")[0].trim();
export const fmt=(n:number)=>new Intl.NumberFormat("fr-CA",{maximumFractionDigits:1}).format(n).replace(/\u202f/g," ");
export const percent=(n:number,d:number)=>d>0?Math.round(n/d*100):null;
export const show=(n:number|null)=>n===null?"—":fmt(n);
export const percentText=(n:number|null)=>n===null?"Non mesuré":fmt(n)+" %";
export const cash=(n:number)=>fmt(n)+" $ CA";
export function reviewWords(texts:string[]){
 const clean=texts.filter(t=>typeof t==="string"&&t.trim());
 const stop=new Set("avec pour dans très plus vous nous leur leurs cette comme être avoir fait faire tout tous toute bien cela aussi mais sont c'est est des les une aux par sur son ses pas qui que ils elle elles notre votre and the was were with this that have from they you our for are very had has but not can their would been will just really recommend merci thank thanks".split(" "));
 const count=new Map<string,number>();
 for(const t of clean)for(const word of new Set(t.toLowerCase().match(/[\p{L}]{4,}/gu)||[])){if(!stop.has(word))count.set(word,(count.get(word)||0)+1);}
 return {textCount:clean.length,words:[...count].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).filter(x=>x[1]>=2).slice(0,8).map(([word,count])=>({word,count}))};
}
export function premium(a:GrowAudit){
 const g=summarizeGrid(a.grid), top=percent(g.top3,g.measured), found=percent(g.found,g.measured);
 const sample=a.reviewSample, ai=a.ai.filter(x=>x.state!=="unknown"), mentions=ai.filter(x=>x.state==="mentioned").length;
 const rivals=a.competitors.filter(c=>c.reviews!==null), max=rivals.length?Math.max(...rivals.map(c=>c.reviews!)):null;
 const reviewRatio=a.reviewCount!==null&&max!==null?Math.min(100,Math.round(a.reviewCount/Math.max(1,max)*100)):null;
 const site=a.website.state==="linked"?100:a.website.state==="not_linked"?0:null;
 const dimensions=[{label:"Visibilité locale",value:top,weight:40},{label:"Volume d’avis comparé",value:reviewRatio,weight:25},{label:"Lien site sur Google",value:site,weight:20},{label:"Présence IA",value:percent(mentions,ai.length),weight:15}];
 const measured=dimensions.filter(d=>d.value!==null), weight=measured.reduce((v,d)=>v+d.weight,0);
 const score=weight>=60?Math.round(measured.reduce((v,d)=>v+d.value!*d.weight,0)/weight):null;
 const response=sample.replied===null?null:percent(sample.replied,sample.count);
 const age=sample.newestObserved?Math.floor((Date.parse(a.date)-Date.parse(sample.newestObserved))/86400000):null;
 const center=a.grid.length?a.grid[Math.floor(a.grid.length/2)]:undefined;
 const better=a.competitors.filter(c=>c.rank!==null&&center?.state==="found"&&center.rank!==null&&c.rank<center.rank).length;
 const sources=new Map<string,number>();const named=new Map<string,string[]>();
 for(const x of ai){for(const s of new Set(x.sources||[]))sources.set(s,(sources.get(s)||0)+1);for(const n of new Set(x.competitors||[]))named.set(n,[...(named.get(n)||[]),x.engine]);}
 const prev=sections(a);
 const actions:{category:string;fact:string;action:string;gain:string;day:number}[]=[];
 if(a.website.state==="not_linked")actions.push({category:"SITE WEB",fact:"Aucun site relié à votre fiche Google.",action:a.website.url?"Relier le site existant et mettre en place une demande de soumission claire.":"Vérifier si un site existe, puis le relier ou créer un site professionnel avec formulaire et CRM.",gain:"Un parcours de contact plus simple, même hors horaires.",day:30});
 else if(a.website.performance!==null&&a.website.performance<70)actions.push({category:"SITE WEB",fact:"Performance mobile : "+a.website.performance+"/100.",action:"Améliorer la vitesse et simplifier la demande de soumission.",gain:"Une expérience plus fluide.",day:30});
 if(response!==null&&response<100||reviewRatio!==null&&reviewRatio<75)actions.push({category:"AVIS",fact:(a.reviewCount===null?"Volume non mesuré":a.reviewCount+" avis")+(max!==null?" contre jusqu’à "+max+" chez les concurrents comparés":"")+(response!==null?" ; "+response+" % de réponses observées.":"."),action:"Répondre aux avis et inviter tous les clients à partager un retour honnête après chaque prestation.",gain:"Davantage de preuve sociale et de confiance.",day:30});
 if(top!==null&&top<50)actions.push({category:"GOOGLE MAPS",fact:g.top3+" / "+g.measured+" points testés dans le Top 3.",action:"Améliorer les catégories, les informations et la pertinence locale de la fiche ; suivre la même grille.",gain:"Une présence locale à renforcer et à mesurer.",day:60});
 if(a.checks.some(c=>c.state!=="ok"))actions.push({category:"FICHE GOOGLE",fact:"Des informations sont à optimiser ou à confirmer.",action:"Vérifier les champs non observés, compléter les services et ajouter du contenu pertinent.",gain:"Des prestations mieux comprises avant le contact.",day:30});
 if(ai.length&&mentions<ai.length)actions.push({category:"VISIBILITÉ IA",fact:mentions+" / "+ai.length+" réponses testées vous citent.",action:"Rendre le site, les profils et les coordonnées cohérents ; suivre les mentions.",gain:"Une présence numérique plus claire et mesurable.",day:60});
 if(!actions.length)actions.push({category:"SUIVI",fact:"Aucun écart majeur confirmé dans les mesures disponibles.",action:"Consolider les acquis et vérifier les données non mesurées.",gain:"Un suivi régulier des résultats.",day:30});
 actions.push({category:"MESURE & CRM",fact:"Les demandes réelles doivent être suivies.",action:"Analyser les contacts et conversions, répéter le diagnostic et ajuster les actions.",gain:"Des décisions fondées sur les résultats.",day:90});
 const priority=actions.slice(0,3), scenario=opportunity(a);
 return {g,top,found,score,weight,dimensions,reviewRatio,max,response,age:age!==null&&Number.isFinite(age)&&age>=0?age:null,ai,mentions,sources:[...sources].sort((a,b)=>b[1]-a[1]).slice(0,5),named:[...named].sort((a,b)=>b[1].length-a[1].length).slice(0,6),better,center,actions,priority,scenario,prev};
}
