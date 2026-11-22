"use server";
import {redirect} from "next/navigation";
import {hostedAuth} from "@/lib/auth/hosted";
import {sessionClient} from "@/lib/auth/supabase-session";
export async function logout(){
 if(hostedAuth()){
  const client=await sessionClient();
  await client.auth.signOut({scope:"local"});
 }
 redirect("/login");
}
