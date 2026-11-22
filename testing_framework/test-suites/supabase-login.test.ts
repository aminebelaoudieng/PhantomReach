import {describe,it,expect,vi,beforeEach} from "vitest";
import {NextRequest} from "next/server";
import type {User} from "@supabase/supabase-js";
const m=vi.hoisted(()=>({binding:vi.fn(),signin:vi.fn(),signout:vi.fn(),hosted:vi.fn()}));
vi.mock("@/lib/auth/hosted",async original=>({...await original<typeof import("@/lib/auth/hosted")>(),hostedAuth:m.hosted,readBinding:m.binding,authConfig:()=>({url:"https://example.supabase.co",key:"test"})}));
vi.mock("@supabase/ssr",()=>({createServerClient:(_url:string,_key:string,options:{cookies:{setAll:(items:{name:string;value:string;options:{httpOnly:boolean;path:string}}[])=>void}})=>({auth:{signInWithPassword:async (credentials:unknown)=>{const res=await m.signin(credentials);if(res.data?.session)options.cookies.setAll([{name:"phantom-auth",value:"test-session",options:{httpOnly:true,path:"/"}}]);return res;},signOut:m.signout}})}));
import {POST} from "@/app/auth/login/route";
const owner={id:"owner-id",email:"owner@example.com",email_confirmed_at:"2026-11-22",is_anonymous:false} as User;
const request=(origin="https://example.com")=>new NextRequest("https://example.com/auth/login",{method:"POST",headers:{origin,host:"example.com","content-type":"application/x-www-form-urlencoded"},body:"email=owner%40example.com&password=secret-test"});
beforeEach(()=>{vi.clearAllMocks();m.hosted.mockReturnValue(true);m.binding.mockResolvedValue("owner-id");m.signout.mockResolvedValue({error:null});});
describe("Native Supabase form login",()=>{
 it("sets the session cookie on the actual redirect response",async()=>{m.signin.mockResolvedValue({data:{user:owner,session:{access_token:"mock"}},error:null});const result=await POST(request());expect(result.status).toBe(303);expect(result.headers.get("location")).toBe("https://example.com/audits");expect(result.headers.get("set-cookie")).toContain("phantom-auth=test-session");expect(result.headers.get("set-cookie")).toContain("HttpOnly");expect(m.signin).toHaveBeenCalledTimes(1);});
 it("shows incorrect credentials and never grants access",async()=>{m.signin.mockResolvedValue({data:{},error:{code:"invalid_credentials",status:400}});const result=await POST(request());expect(result.headers.get("location")).toContain("error=credentials");expect(result.headers.get("set-cookie")).toBeNull();});
 it("rejects a valid account that is not the owner",async()=>{m.signin.mockResolvedValue({data:{user:{...owner,id:"other-id"},session:{access_token:"mock"}},error:null});const result=await POST(request());expect(result.headers.get("location")).toContain("error=authorization");expect(result.headers.get("set-cookie")).toBeNull();});
 it("rejects cross-origin POST before authenticating",async()=>{const result=await POST(request("https://evil.example"));expect(result.headers.get("location")).toContain("error=request");expect(m.signin).not.toHaveBeenCalled();});
 it("reports missing binding separately",async()=>{m.binding.mockResolvedValue(null);const result=await POST(request());expect(result.headers.get("location")).toContain("error=setup");expect(m.signin).not.toHaveBeenCalled();});
});
