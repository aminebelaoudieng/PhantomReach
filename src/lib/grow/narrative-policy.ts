import type {GrowAudit} from "./model";

export type NarrativeTopic="reviews"|"website";
export type NarrativeFacts=Partial<{
 reviews:{favorable:number;neutral:number;unfavorable:number;themes:string[];replyGap:boolean|null};
 website:{issues:string[];contactSignals:boolean|null;linkMissing:boolean};
}>;
const families:Record<string,string>={
 "Titre SEO":"référencement et titres","Méta-description":"référencement et titres","Titre principal H1":"référencement et titres","Structure des titres":"référencement et titres","Titre de page":"référencement et titres","Description Google":"référencement et titres","Titres / descriptions dupliqués":"référencement et titres",
 "Textes alternatifs":"accessibilité des images","Description des images":"accessibilité des images",
 "Indexation":"indexabilité","Indexabilité":"indexabilité","Adresse canonique":"indexabilité","Fichier robots.txt":"indexabilité",
 "Connexion HTTPS":"sécurité HTTPS","Affichage mobile":"affichage mobile",
};
const lexicon:Record<string,RegExp>={
 "qualité du service":/^(qualité|qualite|propre|propreté|proprete|nettoyage|impeccable|soigné|soigne|quality|clean|cleaning|spotless)$/,
 "ponctualité et délais":/^(ponctuel|ponctuelle|ponctualité|ponctualite|retard|retards|horaire|horaires|rapide|rapidité|rapidite|timely|punctual|late)$/,
 "communication":/^(communication|réponse|reponse|réponses|reponses|écoute|ecoute|disponible|responsive|communication)$/,
 "professionnalisme":/^(professionnel|professionnelle|professionnalisme|courtois|courtoisie|politesse|respectueux|professional|friendly)$/,
 "tarifs":/^(prix|tarifs|tarif|cher|chère|chere|coût|cout|price|pricing|expensive)$/,
};
export function planNarrative(a:GrowAudit):NarrativeFacts{
 if(!a.profileFound)return {};
 const result:NarrativeFacts={};
 const s=a.reviewSample;
 const favorable=(s.stars[0]||0)+(s.stars[1]||0);
 const neutral=s.stars[2]||0,unfavorable=(s.stars[3]||0)+(s.stars[4]||0);
 // Straightforward ratings, volume gaps and response rates only need templates.
 // A mixed sample can benefit from a nuanced explanation, without disclosing review text.
 if(s.rated>=4&&favorable>=2&&unfavorable>=1){
  const words=(s.words||[]).filter(w=>w.count>=2).map(w=>w.word.toLowerCase());
  const themes=Object.entries(lexicon).filter(([,re])=>words.some(w=>re.test(w))).map(([label])=>label).slice(0,3);
  result.reviews={favorable,neutral,unfavorable,themes,replyGap:s.replied===null?null:s.replied<s.count};
 }
 // Only distinct confirmed problem families; duplicate Lighthouse/HTML checks count once.
 if(a.website.url){
  const issues=new Set<string>();
  if(a.website.performance!==null&&a.website.performance<70)issues.add("vitesse mobile");
  for(const c of [...(a.website.details?.checks||[]),...(a.website.onpage?.state==="measured"?a.website.onpage.checks:[])]){
   if(c.state==="improve"&&families[c.label])issues.add(families[c.label]);
  }
  if(issues.size>=2){
   const html=a.website.onpage;
   result.website={issues:[...issues].slice(0,4),contactSignals:html?.state==="measured"?html.formCount+html.contactLinkCount+html.ctaCount>0:null,linkMissing:a.website.state==="not_linked"};
  }
 }
 return result;
}
export const NARRATIVE_PROMPT="Rédige en français canadien pour un audit commercial local. Pour chaque clé fournie : une conséquence plausible et une action concrète, en deux phrases, maximum 200 caractères. Pas de chiffre, URL, promesse, donnée inventée ni attribution des thèmes d’avis à une polarité. Un signal de contact ne garantit pas son fonctionnement. Réponds en JSON uniquement, avec les mêmes clés.";
export const NARRATIVE_MAX_OUTPUT=280;
export function narrativePayload(facts:NarrativeFacts){
 const keys=Object.keys(facts);
 return {systemInstruction:{parts:[{text:NARRATIVE_PROMPT}]},contents:[{role:"user",parts:[{text:JSON.stringify(facts)}]}],generationConfig:{temperature:0.2,maxOutputTokens:NARRATIVE_MAX_OUTPUT,thinkingConfig:{thinkingLevel:"MINIMAL"},responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:Object.fromEntries(keys.map(k=>[k,{type:"STRING"}])),required:keys}}};
}
