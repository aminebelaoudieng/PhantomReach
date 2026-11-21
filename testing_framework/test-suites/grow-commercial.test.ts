import {describe,it,expect} from "vitest";
import {opportunity,offerPrice,sections,type GrowAudit} from "../../src/lib/grow/model";
const audit:GrowAudit={version:2,name:"Test",location:"Montréal",date:"2026-11-21",keyword:"nettoyage",source:"test",profileFound:true,rating:5,reviewCount:3,checks:[],score:88,coverage:0,reviewSample:{count:0,rated:0,replied:null,stars:[0,0,0,0,0],newestObserved:null},competitors:[],grid:[],spacingKm:.7,ai:[],website:{url:null,state:"not_linked",performance:null,seo:null},notes:[],priorities:[]};
describe("commercial report",()=>{
 it("uses a clearly hypothetical scenario when no search volume exists",()=>{const o=opportunity(audit);expect(o.actualBase).toBe(false);expect(o.base).toBe(100);expect(o.additional).toBe(3);expect(o.revenue).toBeNull();});
 it("uses entered volume and contract value",()=>{const o=opportunity({...audit,commercial:{monthlySearches:1000,jobValueCad:500}});expect(o.additional).toBe(30);expect(o.revenue).toBe(3750);});
 it("never invents a price",()=>expect(offerPrice(audit)).toBeNull());
 it("contains nine pages, flags missing website and omits legacy completeness score",()=>{const s=sections(audit);expect(s).toHaveLength(9);expect(s[4].metrics?.[0].tone).toBe("alert");expect(JSON.stringify(s)).not.toContain("88/100");});
});
