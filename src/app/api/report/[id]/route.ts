import { NextRequest, NextResponse } from "next/server";
import { requireOwnedReport, requireRouteUser } from "@/lib/auth/route";
import { z } from "zod";
import { db } from "@/lib/db";
import type { AuditResult } from "@/lib/db/types";
import { sanitizeAuditResultContent } from "@/lib/reports/content-contract";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, response } = await requireRouteUser();
  if (response) {
    return response;
  }

  const ownedReport = await requireOwnedReport(id, user.id);
  if (ownedReport.response) {
    return ownedReport.response;
  }

  const report = ownedReport.report;
  const sanitizedReport = report.result && report.type === "audit"
    ? { ...report, result: sanitizeAuditResultContent(report.result as any) }
    : report;

  return NextResponse.json(sanitizedReport);
}

const commercialSchema=z.object({
 monthlySearches:z.number().int().positive().max(10000000).nullable(),
 jobValueCad:z.number().positive().max(1000000).nullable(),
 monthlyPriceCad:z.number().positive().max(1000000).nullable(),
 bookingUrl:z.string().url().max(400).refine(s=>s.startsWith("https://")).nullable().optional(),
});
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {user,response}=await requireRouteUser();if(response)return response;
 const owned=await requireOwnedReport(id,user.id);if(owned.response)return owned.response;
 const report=owned.report;
 const result=report.result as AuditResult|undefined;
 if(report.status!=="completed"||report.type!=="audit"||!result?.grow?.profileFound)return NextResponse.json({error:"Rapport indisponible."},{status:409});
 const data=commercialSchema.safeParse(await request.json().catch(()=>null));
 if(!data.success)return NextResponse.json({error:"Vérifiez les valeurs saisies."},{status:400});
 const commercial={...result.grow.commercial,monthlySearches:data.data.monthlySearches??undefined,jobValueCad:data.data.jobValueCad??undefined,monthlyPriceCad:199,...(data.data.bookingUrl!==undefined?{bookingUrl:data.data.bookingUrl??undefined}:{})};
 const grow={...result.grow,commercial};
 await db.updateReport(id,{result:{...result,grow}});
 return NextResponse.json({grow});
}
