"use server";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {hostedAuth,readBinding,verifyBasic,verifiedOwner,bindWorkspace} from "@/lib/auth/hosted";
import {sessionClient} from "@/lib/auth/supabase-session";
function credentials(form:FormData){
 const email=String(form.get("email")||"").trim(),password=String(form.get("password")||"");
 if(!email||email.length>254||!password||password.length>256)return null;
 return {email,password};
}
export async function login(form:FormData){
 if(!hostedAuth())redirect("/audits");
 const c=credentials(form);
 if(!c)redirect("/login?error=credentials");
 let valid=false;
 try{
  const binding=await readBinding();
  if(binding){
   const client=await sessionClient();
   const {error,data}=await client.auth.signInWithPassword(c);
   valid=!error&&verifiedOwner(data.user,binding);
   if(!valid&&!error)await client.auth.signOut({scope:"local"});
  }
 }catch{/* No credentials or provider messages in logs. */}
 if(!valid)redirect("/login?error=credentials");
 redirect("/audits");
}
export async function setup(form:FormData){
 if(!hostedAuth()||!verifyBasic((await headers()).get("authorization")))redirect("/login");
 const c=credentials(form);
 if(!c)redirect("/auth/setup?error=credentials");
 let linked=false;
 try{
  if(await readBinding()===null){
   const client=await sessionClient();
   const {data,error}=await client.auth.signInWithPassword(c);
   if(!error&&data.user?.email_confirmed_at&&!data.user.is_anonymous&&data.user.email){
    await bindWorkspace(data.user);linked=true;
   }
   if(!linked&&!error)await client.auth.signOut({scope:"local"});
  }
 }catch{/* Fail closed. Revisit setup if not linked. */}
 if(!linked)redirect("/auth/setup?error=credentials");
 redirect("/audits");
}
export async function logout(){
 if(hostedAuth()){
  const client=await sessionClient();
  await client.auth.signOut({scope:"local"});
 }
 redirect("/login");
}
