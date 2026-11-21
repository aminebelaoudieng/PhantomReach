import "server-only";
import {cache} from "react";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {db} from "@/lib/db";
import type {User} from "@/lib/db/types";
import {getLocalWorkspaceUser} from "./local-workspace";
import {hostedAuth,readBinding,verifyBasic,verifiedOwner,WORKSPACE_ID} from "./hosted";
import {sessionClient} from "./supabase-session";
export function getAuthErrorMessage(){return "Authentification requise.";}
export const getCurrentUser=cache(async():Promise<User|null>=>{
 if(!hostedAuth())return getLocalWorkspaceUser();
 const binding=await readBinding();
 if(!binding){
  if(!verifyBasic((await headers()).get("authorization")))return null;
  return getLocalWorkspaceUser();
 }
 const supabase=await sessionClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!verifiedOwner(user,binding))return null;
 const workspace=await db.getUser(WORKSPACE_ID);
 if(!workspace||workspace.auth_user_id!==binding)return null;
 return {...workspace,email:user!.email!};
});
export async function requireCurrentUser():Promise<User>{
 const user=await getCurrentUser();
 if(!user)redirect("/login");
 return user;
}
