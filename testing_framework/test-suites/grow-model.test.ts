import { describe, expect, it } from "vitest";
import { scoreChecks, summarizeGrid, rankLabel } from "../../src/lib/grow/model";
describe("grow report metrics",()=>{
 it("excludes unknown checks",()=>expect(scoreChecks([{title:"a",value:"yes",state:"ok"},{title:"b",value:"no",state:"improve"},{title:"c",value:"?",state:"unknown"}])).toEqual({score:50,coverage:2}));
 it("does not score missing evidence as zero",()=>expect(scoreChecks([])).toEqual({score:null,coverage:0}));
 it("keeps unknown points out of ranking metrics",()=>{const p=[{lat:1,lng:2,rank:2,state:"found" as const,depth:20},{lat:1,lng:3,rank:null,state:"outside" as const,depth:20},{lat:1,lng:4,rank:null,state:"unknown" as const,depth:0}];expect(summarizeGrid(p)).toEqual({measured:2,found:1,top3:1,avg:2});expect(rankLabel(p[1])).toBe(">20");expect(rankLabel(p[2])).toBe("—");});
});
