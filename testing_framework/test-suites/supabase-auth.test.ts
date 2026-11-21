import {describe,it,expect,vi,afterEach} from "vitest";
import {NextRequest} from "next/server";
import {proxy} from "@/proxy";
import {readBinding,verifiedOwner} from "@/lib/auth/hosted";
import type {User} from "@supabase/supabase-js";
const mocks=vi.hoisted(()=>({binding:vi.fn(),getUser:vi.fn()}));
vi.mock("@/lib/auth/hosted",async importOriginal=>({...await importOriginal<typeof import("@/lib/auth/hosted")>(),readBinding:mocks.binding}));
vi.mock("@supabase/ssr",()=>({createServerClient:()=>({auth:{getUser:mocks.getUser}})}));
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
const user={id:"owner-id",email:"owner@example.com",email_confirmed_at:"2026-11-21",is_anonymous:false} as User;
function hosted(){vi.stubEnv("PHANTOM_DB_BACKEND","supabase");vi.stubEnv("SUPABASE_URL","https://example.supabase.co");vi.stubEnv("SUPABASE_PUBLISHABLE_KEY","test");vi.stubEnv("APP_ACCESS_USERNAME","tester");vi.stubEnv("APP_ACCESS_PASSWORD","test-password");}
const legacy="Basic "+Buffer.from("tester:test-password").toString("base64");
describe("Supabase private workspace transition",()=>{
 it("checks confirmed UUID rather than arbitrary user metadata",()=>{expect(verifiedOwner(user,"owner-id")).toBe(true);expect(verifiedOwner({...user,id:"someone-else"},"owner-id")).toBe(false);expect(verifiedOwner({...user,is_anonymous:true},"owner-id")).toBe(false);expect(verifiedOwner(user,null)).toBe(false);});
 it("never challenges for Basic credentials, even before binding",async()=>{hosted();mocks.binding.mockResolvedValue(null);for(const path of ["/","/audits","/auth/setup","/api/reports"]){for(const headers of [{},{authorization:legacy}]){const x=await proxy(new NextRequest("https://example.com"+path,{headers}));expect(x.status).toBe(path.startsWith("/api/")?401:307);expect(x.headers.get("www-authenticate")).toBeNull();if(!path.startsWith("/api/"))expect(x.headers.get("location")).toBe("https://example.com/login");}}expect((await proxy(new NextRequest("https://example.com/login"))).status).toBe(200);});
 it("rejects legacy credentials after binding, protects API and setup",async()=>{hosted();mocks.binding.mockResolvedValue("owner-id");mocks.getUser.mockResolvedValue({data:{user:null},error:{message:"no session"}});const req=new NextRequest("https://example.com/api/reports",{headers:{authorization:legacy}});expect((await proxy(req)).status).toBe(401);expect((await proxy(new NextRequest("https://example.com/auth/setup",{headers:{authorization:legacy}}))).status).toBe(307);});
 it("allows only the linked verified account",async()=>{hosted();mocks.binding.mockResolvedValue("owner-id");mocks.getUser.mockResolvedValue({data:{user},error:null});const result=await proxy(new NextRequest("https://example.com/audits"));expect(result.status).toBe(200);expect(result.headers.get("cache-control")).toContain("no-store");mocks.getUser.mockResolvedValue({data:{user:{...user,id:"other"}},error:null});expect((await proxy(new NextRequest("https://example.com/api/reports"))).status).toBe(401);});
 it("fails closed when database binding is unavailable",async()=>{hosted();mocks.binding.mockRejectedValue(Error("offline"));expect((await proxy(new NextRequest("https://example.com/audits",{headers:{authorization:legacy}}))).status).toBe(503);});
});
