import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRouteUser } from "@/lib/auth/route";
import { cleanLocation } from "@/lib/grow/location";
import { runGrowAudit } from "@/lib/grow/collect";
import { assertPublicHttpUrl } from "@/lib/security/public-http-url";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const auditRequestSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  placeId: z.string().trim().min(1).max(300).optional(),
  address: z.string().trim().max(300).optional(),
  monthlySearches: z.number().int().positive().max(10000000).optional(),
  jobValueCad: z.number().positive().max(1000000).optional(),
  monthlyPriceCad: z.number().positive().max(1000000).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  googleMapsUrl: z.string().url().optional().or(z.literal("")),
  customDirection: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = auditRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = {...parsed.data,...cleanLocation(parsed.data.address || parsed.data.city,parsed.data.state)};
    if (input.url) {
      try {
        await assertPublicHttpUrl(input.url);
      } catch (error) {
        return NextResponse.json(
          { error: "Unsafe website URL", message: error instanceof Error ? error.message : "Blocked URL" },
          { status: 400 },
        );
      }
    }
    const { user, response } = await requireRouteUser();
    if (response) {
      return response;
    }

    const userId = user.id;

    if (user.audit_credits_remaining <= 0) {
      return NextResponse.json(
        { error: "No audit credits remaining. Please upgrade your plan." },
        { status: 403 }
      );
    }

    // Create report record via unified DB
    const report = await db.createReport({
      user_id: userId,
      type: "audit",
      input: {
        businessName: input.businessName,
        placeId: input.placeId,
        address: input.address || undefined,
        monthlySearches: input.monthlySearches,
        jobValueCad: input.jobValueCad,
        monthlyPriceCad: input.monthlyPriceCad,
        city: input.city,
        state: input.state,
        url: input.url || undefined,
        googleMapsUrl: input.googleMapsUrl || undefined,
        customDirection: input.customDirection || undefined,
      },
    });

    // Track usage
    await db.trackUsage({
      user_id: userId,
      action: "audit",
      credits_consumed: 1,
    });

    // Fire-and-forget the pipeline so the client gets the
    // reportId immediately and can redirect to the progress tracker page.
    // The audit page polls /api/report/{id} until status flips to completed.
    await db.updateReport(report.id, { status: "processing" });

    after(async () => {
      try {
        const { result, scores } = await runGrowAudit({
          businessName: input.businessName,
        placeId: input.placeId,
        address: input.address || undefined,
        monthlySearches: input.monthlySearches,
        jobValueCad: input.jobValueCad,
        monthlyPriceCad: input.monthlyPriceCad,
          city: input.city,
          state: input.state,
          url: input.url || undefined,
          googleMapsUrl: input.googleMapsUrl || undefined,
          customDirection: input.customDirection || undefined,
        });
        await db.updateReport(report.id, {
          status: "completed",
          result,
          scores,
        });
        console.log(`[api/audit] Pipeline completed for report ${report.id}`);
      } catch (pipelineError) {
        await db.updateReport(report.id, {
          status: "failed",
        });
        console.error(
          `[api/audit] Pipeline failed for report ${report.id}:`,
          pipelineError instanceof Error ? pipelineError.message : pipelineError,
        );
      }
    });

    // Return immediately so the client can navigate to the progress page
    return NextResponse.json({
      reportId: report.id,
      status: "processing",
      async: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}
