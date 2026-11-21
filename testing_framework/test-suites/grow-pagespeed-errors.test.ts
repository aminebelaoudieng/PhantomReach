import {describe,it,expect} from "vitest";
import {pageSpeedError,pageSpeedTimeout} from "../../src/lib/config/pagespeed-response";
describe("PageSpeed diagnosis",()=>{
 it("distinguishes API disabled, restrictions and quotas",async()=>{for(const [status,reason,match] of [[403,"SERVICE_DISABLED","activée"],[403,"API_KEY_HTTP_REFERRER_BLOCKED","restrictions"],[400,"API_KEY_INVALID","invalide"],[429,"RATE_LIMIT_EXCEEDED","Quota"]] as const){const response=new Response(JSON.stringify({error:{message:"SECRET",details:[{reason}]}}),{status});const message=await pageSpeedError(response);expect(message).toContain(match);expect(message).not.toContain("SECRET");}});
 it("handles a non JSON Google error",async()=>expect(await pageSpeedError(new Response("not json",{status:502}))).toContain("502"));
 it("recognizes timeouts without confusing bad keys",()=>{expect(pageSpeedTimeout(new DOMException("timeout","TimeoutError"))).toBe(true);expect(pageSpeedTimeout(new Error("403"))).toBe(false);});
});
