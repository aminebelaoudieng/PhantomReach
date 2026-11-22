import { describe,it,expect } from "vitest";
import {mapProjection} from "../../src/lib/grow/map";
import {commercialKeyword,citedNames,level} from '../../src/lib/grow/sales-policy';
import {premium,reviewWords} from "../../src/lib/grow/premium";
import {parsePage,pageChecks} from "../../src/lib/grow/onpage";
import {websiteDetails} from "../../src/lib/grow/website-details";
import {generateGrowPDF} from "../../src/lib/grow/pdf";
import type {GrowAudit,Point} from "../../src/lib/grow/model";
const grid:Point[]=Array.from({length:25},(_,i)=>({lat:45.5+(2-Math.floor(i/5))*.0063,lng:-73.6+(i%5-2)*.009,rank:i===12?2:null,state:i===12?"found":"outside",depth:10}));
const a:GrowAudit={version:2,name:"Entreprise Démo | Services d’entretien",location:"Montréal, QC, Canada",date:"2026-11-21",keyword:"entretien ménager résidentiel",source:"Fixture fictive",profileFound:true,rating:5,reviewCount:3,score:88,coverage:8,checks:[{title:"Site relié",value:"Aucun lien observé",state:"improve"},{title:"Description",value:"Description présente",state:"ok"}],reviewSample:{count:3,rated:3,replied:0,stars:[3,0,0,0,0],newestObserved:"2023-11-13"},competitors:[{name:"Concurrent A",rank:1,rating:4.8,reviews:98,website:true},{name:"Concurrent B",rank:3,rating:4.9,reviews:49,website:true}],grid,spacingKm:.7,ai:[{engine:"ChatGPT",state:"absent",sources:[],competitors:[]},{engine:"Gemini",state:"absent",sources:[],competitors:[]},{engine:"Google AI Mode",state:"absent",sources:[],competitors:[]}],website:{url:null,state:"not_linked",performance:null,seo:null},priorities:[],notes:[],commercial:{monthlyPriceCad:199,monthlySearches:1000,jobValueCad:350}};
describe("Grow PDF",()=>{
 it("renders a fourteen-page document with every page in A4 portrait",async()=>{
  let layout:unknown;
  const pdf=await generateGrowPDF(a,{map:false,onRender:data=>{layout=data;}});
  expect(pdf.byteLength).toBeGreaterThan(5000);
  const raw=pdf.toString("latin1");
  const pages=[...raw.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  expect(pages.length).toBe(14);
  // React PDF exposes the laid out document via its render callback.
  const root=(layout as { _INTERNAL__LAYOUT__DATA_?: {children:{children:{box?:{top:number;height:number};style?:{position?:string};type?:string}[]}[]} } | undefined)?._INTERNAL__LAYOUT__DATA_;
  if(root?.children){const overflow=root.children.flatMap((page,i)=>i===0?[]:page.children.filter(node=>node.box&&node.style?.position!=="absolute"&&node.box.top+node.box.height>807).map(node=>({page:i+1,bottom:Math.round(node.box!.top+node.box!.height)})));expect(overflow).toEqual([]);}
  for(const box of pages){expect(Number(box[1])).toBeCloseTo(595.28,0);expect(Number(box[2])).toBeCloseTo(841.89,0);}
 },30000);
 it("renders the existing-site variant and handles unmeasured data",async()=>{
  const pdf=await generateGrowPDF({...a,website:{url:"https://example.com",state:"linked",performance:90,seo:85},grid:[],ai:[],competitors:[],reviewSample:{count:0,rated:0,replied:null,stars:[0,0,0,0,0],newestObserved:null}},{map:false});
  expect([...pdf.toString("latin1").matchAll(/\/MediaBox\s*\[/g)]).toHaveLength(14);
 },30000);
 it("fits the enriched website evidence on page ten",async()=>{
  const parsed=parsePage(Buffer.from('<html><head><title>Services de nettoyage professionnel à Montréal</title><meta name="description" content="Services de nettoyage, résidentiel et commercial, demandes de soumission en ligne."></head><body><h1>Services de nettoyage professionnel</h1><h2>Services</h2><img src="before.jpg"><a href="tel:123">Appelez</a><form></form><button>Demander une soumission</button></body></html>'),"https://example.com");
  const {links,canonical,noindex,og,contentLength,...data}=parsed;
  let layout:unknown;
  const pdf=await generateGrowPDF({...a,website:{url:"https://example.com",state:"linked",performance:45,seo:60,details:websiteDetails({audits:{"largest-contentful-paint":{numericValue:4500},"first-contentful-paint":{numericValue:2000},"cumulative-layout-shift":{numericValue:.21}}}),onpage:{...data,state:"measured",pages:3,checks:pageChecks(parsed)}}},{map:false,onRender:x=>{layout=x;}});
  expect([...pdf.toString("latin1").matchAll(/\/MediaBox\s*\[/g)]).toHaveLength(14);
  const root=(layout as {_INTERNAL__LAYOUT__DATA_?:{children:{children:{box?:{top:number;height:number};style?:{position?:string}}[]}[]}}|undefined)?._INTERNAL__LAYOUT__DATA_;
  if(root?.children[9])expect(root.children[9].children.filter(n=>n.box&&n.style?.position!=="absolute"&&n.box.top+n.box.height>807)).toEqual([]);
 },30000);
 it("does not reuse the incomplete legacy score as a commercial index",()=>{expect(premium(a).score).not.toBe(88);expect(premium({...a,grid:[],ai:[],competitors:[],website:{url:null,state:"unknown",performance:null,seo:null}}).score).toBeNull();});
 it("counts recurring words across individual review texts",()=>expect(reviewWords(["Service propre propre","Service fiable"]).words).toEqual([{word:"service",count:2}]));
 it("preserves unknown signals and chooses a service from actual site evidence",()=>{expect(level(null,25,65)).toBe("neutral");expect(level(0,25,65)).toBe("red");expect(level(44,25,65)).toBe("amber");expect(level(80,25,65)).toBe("good");expect(commercialKeyword("Entreprise de construction","Aqua Service Inc – Professional Drain, Waterproofing & Renovation",[],"ON").keyword).toBe("basement waterproofing");expect(commercialKeyword("Entreprise de construction","Drain Waterproofing",[],"ON","drain repair").keyword).toBe("drain repair");});
 it("extracts explicitly labelled AI names without extra API calls",()=>{expect(citedNames("Construction commerciale * Orlando Corporation : Basée à Mississauga","Aqua Service Inc")).toContain("Orlando Corporation");});
 it("projects the center of a real geographic grid to the center of the map",()=>{const p=mapProjection(grid)!;const center=grid[12];const [x,y]=p.project(center.lat,center.lng);expect(x).toBeCloseTo(240);expect(y).toBeCloseTo(145);});
});
