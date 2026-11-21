import {describe,it,expect} from "vitest";
import {websiteDetails} from "../../src/lib/grow/website-details";
import {sanitizeNarrative} from "../../src/lib/grow/narrative";
describe("website data and Gemini",()=>{
 it("preserves zero metrics, separates TBT from INP and respects unknowns",()=>{const d=websiteDetails({audits:{"total-blocking-time":{numericValue:0},"cumulative-layout-shift":{numericValue:0},"document-title":{score:1},"image-alt":{score:0},"robots-txt":{score:1,scoreDisplayMode:"notApplicable"}}});expect(d.tbtMs).toBe(0);expect(d.cls).toBe(0);expect(d.lcpMs).toBeNull();expect(d.checks.find(c=>c.label==="Titre de page")?.state).toBe("ok");expect(d.checks.find(c=>c.label==="Fichier robots.txt")?.state).toBe("unknown");});
 it("accepts concise text but rejects generated numeric claims",()=>{expect(sanitizeNarrative({reviews:"Votre réputation peut être renforcée par un suivi régulier des avis.",maps:"Vous gagnerez 50 prospects par mois."})).toEqual({reviews:"Votre réputation peut être renforcée par un suivi régulier des avis."});});
});
