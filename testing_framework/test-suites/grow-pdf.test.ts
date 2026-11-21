import { describe,it,expect } from "vitest";
import {generateGrowPDF} from "../../src/lib/grow/pdf";
import type {GrowAudit,Point} from "../../src/lib/grow/model";
const grid:Point[]=Array.from({length:25},(_,i)=>({lat:45.5,lng:-73.6,rank:i===12?2:null,state:i===12?"found":"outside",depth:10}));
const a:GrowAudit={version:2,name:"Entreprise Démo | Services d’entretien",location:"Montréal, QC, Canada",date:"2026-11-21",keyword:"entretien ménager résidentiel",source:"Fixture fictive",profileFound:true,rating:5,reviewCount:3,score:88,coverage:8,checks:[{title:"Site relié",value:"Aucun lien observé",state:"improve"},{title:"Description",value:"Description présente",state:"ok"}],reviewSample:{count:3,rated:3,replied:0,stars:[3,0,0,0,0],newestObserved:"2023-11-13"},competitors:[{name:"Concurrent A",rank:1,rating:4.8,reviews:98,website:true},{name:"Concurrent B",rank:3,rating:4.9,reviews:49,website:true}],grid,spacingKm:.7,ai:[{engine:"ChatGPT",state:"absent",sources:[],competitors:[]},{engine:"Gemini",state:"absent",sources:[],competitors:[]},{engine:"Google AI Mode",state:"absent",sources:[],competitors:[]}],website:{url:null,state:"not_linked",performance:null,seo:null},priorities:[],notes:[],commercial:{monthlyPriceCad:199,monthlySearches:1000,jobValueCad:350}};
describe("Grow PDF",()=>{
 it("renders a nine-page document with every page in A4 portrait",async()=>{
  const pdf=await generateGrowPDF(a);
  expect(pdf.byteLength).toBeGreaterThan(5000);
  const raw=pdf.toString("latin1");
  const pages=[...raw.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  expect(pages.length).toBe(9);
  for(const box of pages){expect(Number(box[1])).toBeCloseTo(595.28,0);expect(Number(box[2])).toBeCloseTo(841.89,0);}
 },30000);
});
