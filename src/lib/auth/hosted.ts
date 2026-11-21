import {createClient,type User as AuthUser} from "@supabase/supabase-js";
export const WORKSPACE_ID="00000000-0000-4000-8000-000000000001";
export const hostedAuth=()=>process.env.PHANTOM_DB_BACKEND==="supabase";
export function authConfig(){
 const url=process.env.SUPABASE_URL?.trim()||process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
 const key=process.env.SUPABASE_PUBLISHABLE_KEY?.trim()||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
 if(!url||!key)throw Error("Supabase Auth configuration missing");
 return {url,key};
}
function databaseClient(){
 const {url,key}=authConfig(),token=process.env.PHANTOM_DB_ACCESS_TOKEN?.trim();
 if(!token)throw Error("Workspace authorization unavailable");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{"x-phantom-db-token":token},fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(8000)})}});
}
export async function readBinding():Promise<string|null>{
 const {data,error}=await databaseClient().from("users").select("auth_user_id").eq("id",WORKSPACE_ID).single();
 if(error||!data)throw Error("Workspace authorization unavailable");
 return typeof data.auth_user_id==="string"&&data.auth_user_id?data.auth_user_id:null;
}
export function verifiedOwner(user:AuthUser|null|undefined,binding:string|null){
 return !!(binding&&user&&user.id===binding&&!user.is_anonymous&&user.email_confirmed_at&&user.email);
}
