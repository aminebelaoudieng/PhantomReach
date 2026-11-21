import {describe,it,expect} from "vitest";
import {cleanLocation,matchesAuditLocation} from "../../src/lib/grow/location";
describe("audit location",()=>{
 it("removes address and display metadata",()=>expect(cleanLocation("879 Rue Sumer, Laval, QC H7R 6G9, Canada, · Audited 21/11/2026, undefined")).toEqual({city:"Laval",state:"QC"}));
 it("keeps valid city and province",()=>expect(cleanLocation("Montréal","QC")).toEqual({city:"Montréal",state:"QC"}));
});

describe("manual address matching",()=>{
 it("accepts consistent address",()=>expect(matchesAuditLocation("879 Rue Sumer, Laval, QC H7R 6G9, Canada","879 rue Sumer, Laval, QC H7R 6G9","Laval")).toBe(true));
 it("rejects wrong street number",()=>expect(matchesAuditLocation("123 Rue Sumer, Laval, QC","879 Rue Sumer, Laval, QC","Laval")).toBe(false));
 it("accepts service city",()=>expect(matchesAuditLocation("Laval, QC, Canada","Laval","Laval")).toBe(true));
});
