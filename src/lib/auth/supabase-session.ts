import {createServerClient} from "@supabase/ssr";
import {cookies} from "next/headers";
import {authConfig} from "./hosted";
export async function sessionClient(){
 const jar=await cookies(),{url,key}=authConfig();
 return createServerClient(url,key,{cookieOptions:{name:"phantom-auth",httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"},cookies:{
 getAll:()=>jar.getAll(),
 setAll:(items)=>{try{for(const {name,value,options} of items)jar.set(name,value,options);}catch{/* Proxy handles refresh for Server Components. */}}
 },global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(12000)})}});
}
