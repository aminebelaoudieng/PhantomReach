// Normalize user-entered city/address without treating report UI metadata as a location.
export function cleanLocation(city?:string,state?:string):{city?:string;state?:string} {
  const raw=(city||"").split(/\s*·\s*|\s*\|\s*/)[0].trim().replace(/,\s*(undefined|null)\s*$/i,"");
  const parts=raw.split(",").map(s=>s.trim()).filter(s=>s&&!/^(undefined|null|Canada|USA|United States)$/i.test(s));
  let province=(state||"").trim();
  if(/^(undefined|null)$/i.test(province))province="";
  // Canadian formatted addresses: street, city, QC H7R 6G9, Canada
  const last=parts.at(-1)||"";
  const m=last.match(/^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)(?:\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d)?$/i);
  const named=/^(qu[eé]bec|ontario|british columbia|alberta|manitoba|new brunswick|nova scotia|saskatchewan|newfoundland and labrador|prince edward island)$/i.test(last);
  if((m||named)&&parts.length>1){province=province|| (m?m[1].toUpperCase():last);parts.pop();}
  const selected=parts.at(-1)||"";
  return {city:selected&&!/^\d/.test(selected)?selected:undefined,state:province||undefined};
}

const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const postal=(s:string)=>s.match(/\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/i)?.[0].replace(/[^a-z0-9]/gi,"").toUpperCase();
export function matchesAuditLocation(candidate?:string,address?:string,city?:string):boolean{
 if(!address&&!city)return true;
 if(!candidate)return false;
 const expected=city||cleanLocation(address).city;
 if(expected&&!norm(candidate).includes(norm(expected)))return false;
 if(!address)return true;
 const a=postal(address),b=postal(candidate);
 if(a&&b&&a!==b)return false;
 const n=address.trim().match(/^(\d+[a-z]?)\s+/i)?.[1];
 const m=candidate.trim().match(/^(\d+[a-z]?)\s+/i)?.[1];
 if(n&&(!m||n.toLowerCase()!==m.toLowerCase()))return false;
 if(n){
   const ignore=new Set(["rue","street","st","avenue","ave","boulevard","blvd","boul","route","road","rd","chemin","drive","canada","quebec","qc","des","les"]);
   const given=norm(address.split(",")[0]).split(" ").filter(w=>w.length>2&&!ignore.has(w)&&!/^\d/.test(w));
   const found=new Set(norm(candidate).split(" "));
   if(given.length&&!given.some(w=>found.has(w)))return false;
 }
 return !!(expected||n||a);
}
