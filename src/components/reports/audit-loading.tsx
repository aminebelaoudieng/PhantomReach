"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Star, Globe, Sparkles, FileText } from "lucide-react";
import type { Report } from "@/lib/db/types";
interface Props { reportId?:string; businessName:string; city?:string; onComplete:(report:Report)=>void; onError?:(message:string)=>void }
export function AuditLoading({reportId,businessName,city,onComplete}:Props){
 const [elapsed,setElapsed]=useState(0);
 const [connection,setConnection]=useState("Préparation de l’audit");
 const completed=useRef(false);
 const callback=useRef(onComplete);
 useEffect(()=>{callback.current=onComplete},[onComplete]);
 useEffect(()=>{const start=Date.now();const t=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>{if(!reportId)return;let active=true;let busy=false;
 const poll=async()=>{if(busy||completed.current)return;busy=true;try{const response=await fetch("/api/report/"+encodeURIComponent(reportId),{cache:"no-store"});if(!active)return;if(!response.ok){setConnection("Vérification de la connexion…");return;}const report:Report=await response.json();if(!active)return;if(report.status==="completed"||report.status==="failed"||report.status==="partial"){completed.current=true;callback.current(report);}else setConnection("Collecte et analyse en cours");}catch{if(active)setConnection("Reconnexion au serveur…");}finally{busy=false;}};
 void poll();const timer=setInterval(poll,3000);return()=>{active=false;clearInterval(timer)};},[reportId]);
 const steps=[{icon:MapPin,label:"Fiche Google et positionnement"},{icon:Star,label:"Avis et concurrence"},{icon:Sparkles,label:"Visibilité dans les IA (si disponible)"},{icon:Globe,label:"Performance du site"},{icon:FileText,label:"Rapport de visibilité"}];
 return <div className="mx-auto max-w-xl py-12"><div className="rounded-2xl border border-emerald-950/10 bg-white p-8 text-center shadow-sm"><Loader2 className="mx-auto mb-5 h-10 w-10 animate-spin text-[#114537]"/><p className="text-xs uppercase tracking-widest text-emerald-800">Grow System</p><h2 className="mt-2 text-2xl font-bold">{businessName}</h2><p className="text-sm text-slate-500">{city}</p><p role="status" className="mt-6 font-semibold text-[#114537]">{connection}</p><p className="mt-1 text-xs text-slate-500">{Math.floor(elapsed/60)} min {elapsed%60} s</p><div className="mt-7 space-y-3 text-left">{steps.map(({icon:Icon,label})=><div key={label} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm"><Icon className="h-5 w-5 text-[#114537]"/>{label}</div>)}</div><p className="mt-5 text-xs text-slate-500">Les étapes listées sont les contrôles prévus, et non une progression mesurée. Les données non disponibles seront indiquées dans le rapport.</p></div></div>;
}
