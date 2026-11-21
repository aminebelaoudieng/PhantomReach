import {describe,it,expect} from "vitest";
import {cleanLocation} from "../../src/lib/grow/location";
describe("audit location",()=>{
 it("removes address and display metadata",()=>expect(cleanLocation("879 Rue Sumer, Laval, QC H7R 6G9, Canada, · Audited 21/11/2026, undefined")).toEqual({city:"Laval",state:"QC"}));
 it("keeps valid city and province",()=>expect(cleanLocation("Montréal","QC")).toEqual({city:"Montréal",state:"QC"}));
});
