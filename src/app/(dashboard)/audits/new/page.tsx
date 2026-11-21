"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutocompleteInput, type AutocompleteSuggestion } from "@/components/ui/autocomplete-input";
import { Search, MapPin, Globe } from "lucide-react";
import { cleanLocation } from "@/lib/grow/location";

const token=()=>crypto.randomUUID();
export default function NewAuditPage(){
 const router=useRouter();
 const [form,setForm]=useState({businessName:"",address:"",placeId:"",url:"",googleMapsUrl:"",customDirection:"",monthlySearches:"",jobValueCad:"",monthlyPriceCad:""});
 const session=useRef("");
 const revision=useRef(0);
 const [pending,setPending]=useState(false);
 const businessSuggestions=useCallback(async(q:string):Promise<AutocompleteSuggestion[]>=>{
   try {
     if(!session.current)session.current=token();
     const params=new URLSearchParams({q,sessionToken:session.current});
     const city=cleanLocation(form.address).city;
     if(city)params.set("city",city);
     const res=await fetch("/api/autocomplete/business?"+params);
     if(!res.ok)return [];
     const data=await res.json();
     return (data.suggestions||[]).map((s:{name:string;address?:string;placeId?:string;website?:string;googleMapsUrl?:string;city?:string;state?:string})=>({label:s.name,sublabel:s.address,data:{...s}}));
   } catch{return [];}
 },[form.address]);
 const addressSuggestions=useCallback(async(q:string):Promise<AutocompleteSuggestion[]>=>{
   try{
     const res=await fetch("/api/autocomplete/address?"+new URLSearchParams({q}));
     if(!res.ok)return [];
     const data=await res.json();
     return (data.suggestions||[]).map((s:{address:string})=>({label:s.address}));
   }catch{return [];}
 },[]);
 function changeBusiness(value:string){
   revision.current++;setPending(false);
   setForm(prev=>({...prev,businessName:value,placeId:"",googleMapsUrl:"",url:""}));
 }
 function changeAddress(value:string){
   revision.current++;setPending(false);
   setForm(prev=>value.trim()===prev.address.trim()?prev:{...prev,address:value,placeId:"",googleMapsUrl:""});
 }
 async function selectBusiness(s:AutocompleteSuggestion){
   const d=s.data||{}, placeId=typeof d.placeId==="string"?d.placeId:"";
   const rev=++revision.current;
   setForm(prev=>({...prev,businessName:s.label,placeId,address:typeof d.address==="string"?d.address:[d.city,d.state].filter(Boolean).join(", ")||prev.address,url:typeof d.website==="string"?d.website:"",googleMapsUrl:typeof d.googleMapsUrl==="string"?d.googleMapsUrl:""}));
   if(!placeId)return;
   setPending(true);
   const sessionToken=session.current;session.current="";
   try{
     const res=await fetch("/api/autocomplete/place-details?"+new URLSearchParams({placeId,sessionToken}));
     const data=res.ok?await res.json():null;
     if(data?.details&&revision.current===rev){
       const d=data.details;
       setForm(prev=>({...prev,address:d.address||[d.city,d.state].filter(Boolean).join(", ")||prev.address,url:prev.url||d.website||"",googleMapsUrl:d.googleMapsUrl||prev.googleMapsUrl}));
     }
   }catch{}finally{if(revision.current===rev)setPending(false);}
 }
 function submit(e:React.FormEvent){
   e.preventDefault();if(!form.businessName.trim()||pending)return;
   const params=new URLSearchParams();
   for(const [key,val] of Object.entries(form))if(val.trim())params.set(key,val.trim());
   router.push("/audits/loading?"+params);
 }
 return <div className="mx-auto max-w-2xl space-y-6">
   <div><h1 className="text-3xl font-bold tracking-tight">Nouvel audit de visibilité</h1><p className="mt-1 text-muted-foreground">Recherchez une entreprise ou renseignez ses informations manuellement.</p></div>
   <Card><CardHeader><CardTitle>Informations de l’entreprise</CardTitle><CardDescription>Le nom et l’adresse permettent d’identifier la bonne fiche Google.</CardDescription></CardHeader><CardContent>
   <form onSubmit={submit} className="space-y-6">
    <div className="space-y-2"><label htmlFor="businessName" className="text-sm font-medium">Nom de l’entreprise *</label><AutocompleteInput id="businessName" value={form.businessName} onChange={changeBusiness} onSelect={selectBusiness} fetchSuggestions={businessSuggestions} placeholder="Ex. Constantine Entretien Ménager" icon={<Search className="h-4 w-4"/>} required debounceMs={350}/><p className="text-xs text-muted-foreground">Sélectionnez une suggestion pour remplir automatiquement l’adresse et le site web.</p></div>
    <div className="space-y-2"><label htmlFor="address" className="text-sm font-medium">Adresse</label><AutocompleteInput id="address" value={form.address} onChange={changeAddress} fetchSuggestions={addressSuggestions} placeholder="Ex. 879 Rue Sumer, Laval, QC H7R 6G9, Canada" icon={<MapPin className="h-4 w-4"/>} debounceMs={350} minChars={3}/><p className="text-xs text-muted-foreground">Choisissez une adresse Google ou saisissez l’adresse complète. Pour une entreprise sans adresse publique, indiquez sa ville ou sa zone desservie.</p></div>
    <div className="space-y-2"><label htmlFor="url" className="text-sm font-medium">Site web <span className="text-muted-foreground">(facultatif)</span></label><div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input id="url" type="url" className="pl-10" placeholder="https://exemple.ca" value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))}/></div></div>
    <div className="space-y-2"><label htmlFor="customDirection" className="text-sm font-medium">Mot-clé local à mesurer <span className="text-muted-foreground">(facultatif)</span></label><Input id="customDirection" placeholder="Ex. entretien ménager résidentiel" value={form.customDirection} onChange={e=>setForm(p=>({...p,customDirection:e.target.value}))}/></div>
    <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Personnaliser la proposition commerciale (facultatif)</summary><div className="mt-4 grid gap-4"><div><label htmlFor="monthlySearches" className="text-sm font-medium">Recherches locales mensuelles (si connues)</label><Input id="monthlySearches" type="number" min="1" max="10000000" step="1" placeholder="Laisser vide pour une illustration par 100 recherches" value={form.monthlySearches} onChange={e=>setForm(p=>({...p,monthlySearches:e.target.value}))}/></div><div><label htmlFor="jobValueCad" className="text-sm font-medium">Valeur moyenne d’un contrat ($ CA)</label><Input id="jobValueCad" type="number" min="1" max="1000000" step="0.01" placeholder="Si connue" value={form.jobValueCad} onChange={e=>setForm(p=>({...p,jobValueCad:e.target.value}))}/></div><div><label htmlFor="monthlyPriceCad" className="text-sm font-medium">Votre tarif mensuel ($ CA)</label><Input id="monthlyPriceCad" type="number" min="1" max="1000000" step="0.01" placeholder="Tarif global configuré ou sur devis" value={form.monthlyPriceCad} onChange={e=>setForm(p=>({...p,monthlyPriceCad:e.target.value}))}/></div></div></details>
    <Button type="submit" className="w-full" size="lg" disabled={!form.businessName.trim()||pending}>{pending?"Récupération de la fiche…":"Générer mon audit"}</Button>
    <p className="text-center text-xs text-muted-foreground">Rapport en français · Google Places, SerpKite et PageSpeed</p>
   </form></CardContent></Card>
 </div>;
}
