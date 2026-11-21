import { requireRouteUser } from "@/lib/auth/route";
import { NextResponse } from "next/server";
import { listDataSources } from "@/lib/config/provider-config";

export async function GET() {
  const auth=await requireRouteUser();if(auth.response)return auth.response;
  try {
    const sources = await listDataSources();
    return NextResponse.json({ sources });
  } catch (error) {
    console.error("[data-sources] list failed:", error);
    return NextResponse.json(
      { error: "Failed to load data sources" },
      { status: 500 }
    );
  }
}
