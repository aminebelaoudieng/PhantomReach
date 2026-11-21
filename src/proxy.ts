import {NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {authConfig,basicConfigured,hostedAuth,readBinding,verifiedOwner,verifyBasic} from "@/lib/auth/hosted";
function privateResponse(response:NextResponse){
 response.headers.set("Cache-Control","private, no-store, max-age=0");
 response.headers.set("Pragma","no-cache");
 return response;
}
function challenge(){return privateResponse(new NextResponse("Authentication required",{status:401,headers:{"WWW-Authenticate":'Basic realm="Phantom Reach initial setup", charset="UTF-8"'}}));}
function unavailable(){return privateResponse(new NextResponse("Access configuration unavailable.",{status:503}));}
export async function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;
 if(path==="/api/health")return NextResponse.next();
 if(!hostedAuth()){
  if(!basicConfigured())return process.env.VERCEL==="1"?unavailable():NextResponse.next();
  return verifyBasic(request.headers.get("authorization"))?privateResponse(NextResponse.next()):challenge();
 }
 let response=privateResponse(NextResponse.next({request}));
 function finish(next:NextResponse){
  for(const c of response.cookies.getAll())next.cookies.set(c);
  for(const header of ["cache-control","expires","pragma"]){const v=response.headers.get(header);if(v)next.headers.set(header,v);}
  return privateResponse(next);
 }
 try{
  const binding=await readBinding();
  // One-time setup is password-protected and becomes unavailable once bound.
  if(path==="/auth/setup"){
   if(binding)return finish(NextResponse.redirect(new URL("/login",request.url)));
   if(!basicConfigured())return unavailable();
   return verifyBasic(request.headers.get("authorization"))?response:challenge();
  }
  if(path==="/login"||path==="/auth/callback")return response;
  if(!binding){
   // Preserve access during migration, but never accept legacy credentials once linked.
   if(!basicConfigured())return unavailable();
   return verifyBasic(request.headers.get("authorization"))?response:finish(NextResponse.redirect(new URL("/login",request.url)));
  }
  const {url,key}=authConfig();
  const supabase=createServerClient(url,key,{cookieOptions:{name:"phantom-auth",httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"},cookies:{
   getAll:()=>request.cookies.getAll(),
   setAll:(items,headers)=>{
    for(const {name,value} of items)request.cookies.set(name,value);
    response=privateResponse(NextResponse.next({request}));
    for(const {name,value,options} of items)response.cookies.set(name,value,options);
    for(const [name,value] of Object.entries(headers||{}))response.headers.set(name,value);
   }
  },global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(10000)})}});
  const {data:{user},error}=await supabase.auth.getUser();
  if(!error&&verifiedOwner(user,binding))return response;
  if(path.startsWith("/api/"))return finish(NextResponse.json({error:"Authentification requise."},{status:401}));
  return finish(NextResponse.redirect(new URL("/login",request.url)));
 }catch{return unavailable();}
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
