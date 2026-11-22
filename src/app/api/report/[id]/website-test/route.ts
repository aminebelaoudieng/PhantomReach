import {NextRequest,NextResponse} from "next/server";
import {requireRouteUser,requireOwnedReport} from "@/lib/auth/route";
import {db} from "@/lib/db";
import type {AuditResult} from "@/lib/db/types";
import {assertPublicHttpUrl} from "@/lib/security/public-http-url";
import {measureWebsiteSpeed} from "@/lib/grow/speed";

export const dynamic="force-dynamic";
export const maxDuration=180;
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:"Requête refusée."},{status:403});
 const auth=await requireRouteUser();if(auth.response)return auth.response;
 const {id}=await params;
 const initial=await requireOwnedReport(id,auth.user.id);if(initial.response)return initial.response;
 const result=initial.report.result as AuditResult|undefined;
 const url=result?.grow?.website.url;
 if(initial.report.type!=="audit"||initial.report.status!=="completed"||!url||!result?.grow?.profileFound)return NextResponse.json({error:"Aucun site à tester dans ce rapport."},{status:409});
 try{await assertPublicHttpUrl(url);}catch{return NextResponse.json({error:"Adresse web non vérifiable."},{status:400});}
 try{
  const speed=await measureWebsiteSpeed(url);
  // Read the latest result again so saved prices, bookings and other updates remain intact.
  const latest=await requireOwnedReport(id,auth.user.id);if(latest.response)return latest.response;
  const current=latest.report.result as AuditResult|undefined;
  if(!current?.grow||current.grow.website.url!==url)return NextResponse.json({error:"Le rapport a changé. Relancez le test."},{status:409});
  const grow={...current.grow,website:{...current.grow.website,...speed}};
  await db.updateReport(id,{result:{...current,grow}});
  return NextResponse.json({grow,measured:speed.performance!==null||speed.desktopPerformance!=null});
 }catch{return NextResponse.json({error:"Le test de vitesse n’a pas pu être terminé."},{status:502});}
}
