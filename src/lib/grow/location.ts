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
