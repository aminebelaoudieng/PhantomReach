import {NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {authConfig,hostedAuth,readBinding,verifiedOwner} from "@/lib/auth/hosted";
function redirectTo(request:NextRequest,path:string){
 const response=NextResponse.redirect(new URL(path,request.url),303);
 response.headers.set("Cache-Control","private, no-store, max-age=0");
 return response;
}
export async function POST(request:NextRequest){
 const origin=request.headers.get("origin");
 if(!origin||origin==="null")return redirectTo(request,"/login?error=request");
 try{const u=new URL(origin);const host=request.headers.get("host")||request.nextUrl.host;
  if(u.host!==host||u.protocol!==request.nextUrl.protocol)return redirectTo(request,"/login?error=request");
 }catch{return redirectTo(request,"/login?error=request");}
 if(!hostedAuth())return redirectTo(request,"/login?error=service");
 if(Number(request.headers.get("content-length")||0)>16384)return redirectTo(request,"/login?error=request");
 let form:FormData;
 try{form=await request.formData();}catch{return redirectTo(request,"/login?error=request");}
 const email=form.get("email"),password=form.get("password");
 if(typeof email!=="string"||typeof password!=="string"||email.length>254||password.length>256||!email.trim()||!password)return redirectTo(request,"/login?error=credentials");
 try{
  console.info("[auth/login] submitting credentials");
  const binding=await readBinding();
  if(!binding)return redirectTo(request,"/login?error=setup");
  const {url,key}=authConfig();
  const response=redirectTo(request,"/audits");
  const supabase=createServerClient(url,key,{
   cookieOptions:{name:"phantom-auth",httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"},
   cookies:{getAll:()=>request.cookies.getAll(),setAll:(items)=>{for(const {name,value,options} of items){request.cookies.set(name,value);response.cookies.set(name,value,options);}}},
   global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(12000)})}
  });
  const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(error){
   const code=error.code==="invalid_credentials"?"credentials":error.code==="email_not_confirmed"?"confirmation":error.status===429?"rate":"service";
   console.warn("[auth/login] provider result",code,error.status??"unknown");
   return redirectTo(request,"/login?error="+code);
  }
  if(!data.session||!verifiedOwner(data.user,binding)){
   await supabase.auth.signOut({scope:"local"}).catch(()=>null);
   console.warn("[auth/login] session or owner rejected");
   return redirectTo(request,"/login?error=authorization");
  }
  console.info("[auth/login] success");
  return response;
 }catch(error){console.warn("[auth/login] unavailable",error instanceof Error?error.name:"unknown");return redirectTo(request,"/login?error=service");}
}
