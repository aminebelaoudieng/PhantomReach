import {describe,it,expect,vi,beforeEach} from "vitest";
import {measureWebsiteSpeed} from "../../src/lib/grow/speed";
const mocks=vi.hoisted(()=>({run:vi.fn()}));
vi.mock("@/lib/agents/tools/pagespeed",()=>({runPageSpeedAudit:mocks.run}));
beforeEach(()=>vi.clearAllMocks());
describe("independent speed measurements",()=>{
 it("measures phone and computer separately",async()=>{mocks.run.mockImplementation(async(p:{strategy:string})=>({analysis:{performance_score:p.strategy==="mobile"?43:91,seo_score:85},rawLighthouse:{}}));const x=await measureWebsiteSpeed("https://example.com");expect(x.performance).toBe(43);expect(x.desktopPerformance).toBe(91);expect(mocks.run).toHaveBeenCalledTimes(2);expect(mocks.run.mock.calls[0][0].strategy).toBe("mobile");expect(mocks.run.mock.calls[1][0].strategy).toBe("desktop");});
 it("does not make a duplicate request when the service refuses access",async()=>{mocks.run.mockResolvedValue({unavailable:true,status:"blocked",reason:"HTTP 403"});const x=await measureWebsiteSpeed("https://example.com");expect(x.performance).toBeNull();expect(x.desktopPerformance).toBeNull();expect(x.speedStatus?.mobile).toBe("HTTP 403");expect(mocks.run).toHaveBeenCalledTimes(1);});
 it("does not invent mobile results if only desktop succeeds",async()=>{mocks.run.mockResolvedValueOnce({unavailable:true,status:"failed",reason:"timeout"}).mockResolvedValueOnce({analysis:{performance_score:87,seo_score:85},rawLighthouse:{}});const x=await measureWebsiteSpeed("https://example.com");expect(x.performance).toBeNull();expect(x.desktopPerformance).toBe(87);});
});
