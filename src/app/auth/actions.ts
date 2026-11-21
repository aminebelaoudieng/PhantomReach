"use server";
import {redirect} from "next/navigation";
import {hostedAuth,readBinding,verifiedOwner} from "@/lib/auth/hosted";
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
export async function logout(){
 if(hostedAuth()){
  const client=await sessionClient();
  await client.auth.signOut({scope:"local"});
 }
 redirect("/login");
}
