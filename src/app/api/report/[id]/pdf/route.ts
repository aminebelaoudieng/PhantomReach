import { NextRequest, NextResponse } from "next/server";
import { requireOwnedReport, requireRouteUser } from "@/lib/auth/route";
import { generateGrowPDF } from "@/lib/grow/pdf";
import type { AuditResult } from "@/lib/db/types";
import { generateReportPDF } from "@/lib/pdf/generate-pdf";
import { sanitizeAuditResultContent } from "@/lib/reports/content-contract";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (report.status !== "completed" || !report.result) {
      return NextResponse.json({ error: "Report not ready" }, { status: 400 });
    }

    const exportReport = report.type === "audit"
      ? { ...report, result: sanitizeAuditResultContent(report.result as any) }
      : report;
    const grow = report.type === 'audit' ? (report.result as AuditResult).grow : undefined;
    if(grow && !grow.profileFound) return NextResponse.json({error:"Fiche Google non identifiée. Relancez l’audit."},{status:422});
    const pdfBuffer = grow ? await generateGrowPDF(grow) : await generateReportPDF(exportReport);

    const businessName = (report.input as any).businessName || "Business";
    const filename = `${businessName.replace(/[^a-zA-Z0-9]/g, "_")}_Audit_Report.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "PDF generation failed", message: err.message },
      { status: 500 }
    );
  }
}
