import { NextRequest, NextResponse } from "next/server";
import { getProviderSecret } from "@/lib/config/provider-config";
import { requireRouteUser } from "@/lib/auth/route";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const {response}=await requireRouteUser();if(response)return response;
 const q=request.nextUrl.searchParams.get("q")?.trim()||"";
 if(q.length<3||q.length>300)return NextResponse.json({suggestions:[]});
 const key=await getProviderSecret("google_places_api_key");
 if(!key)return NextResponse.json({suggestions:[]});
 const params=new URLSearchParams({input:q,key,language:"fr",types:"geocode",components:"country:"+(process.env.GROW_COUNTRY||"ca")});
 try{
   const res=await fetch("https://maps.googleapis.com/maps/api/place/autocomplete/json?"+params,{signal:AbortSignal.timeout(6000),cache:"no-store"});
   if(!res.ok){console.warn("[autocomplete/address] HTTP",res.status);return NextResponse.json({suggestions:[]});}
   const data=await res.json();
   if(data.status!=="OK"&&data.status!=="ZERO_RESULTS")console.warn("[autocomplete/address] Google status",data.status);
   const predictions=Array.isArray(data.predictions)?data.predictions:[];
   // Address suggestions are never used as business Place IDs.
   return NextResponse.json({suggestions:predictions.slice(0,8).filter((p:{description?:string})=>typeof p.description==="string"&&p.description.trim()).map((p:{description:string})=>({address:p.description}))});
 }catch{console.warn("[autocomplete/address] failed");return NextResponse.json({suggestions:[]});}
}
