import { NextRequest, NextResponse } from "next/server";
import {
  getSecret,
  setSecret,
  updateSecretTestStatus,
  type LocalSecretKey,
  type SecretStatus,
} from "@/lib/config/local-secrets";
import { getProviderDefinition } from "@/lib/config/provider-config";
import { getProviderSecret } from "@/lib/config/provider-config";
import { pageSpeedError,pageSpeedTimeout } from "@/lib/config/pagespeed-response";
export const maxDuration=120;

interface RouteContext {
  params: Promise<{ key: string }>;
}

async function testGooglePlaces(value: string): Promise<string> {
  const params = new URLSearchParams({
    query: "dentist in Seattle",
    key: value,
    language: "en",
  });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
  const data = await response.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places status: ${data.status}`);
  }
  return "Google Places responded successfully.";
}

async function testPageSpeed(value: string): Promise<string> {
  const params = new URLSearchParams({
    url: "https://example.com/",
    strategy: "mobile",
    category: "performance",
    fields: "lighthouseResult(categories(performance(score)),runtimeError),analysisUTCTimestamp",
    key: value,
  });
  const started=Date.now();
  try{
    const response = await fetch(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?"+params,
      { signal: AbortSignal.timeout(75000), cache:"no-store" }
    );
    if (!response.ok) throw new Error(await pageSpeedError(response));
    const data=await response.json();
    if(data?.lighthouseResult?.runtimeError||typeof data?.lighthouseResult?.categories?.performance?.score!=="number")throw new Error("Google répond, mais le test Lighthouse n’a pas produit de score. Réessayez.");
    console.info("[settings/pagespeed] success",Math.round((Date.now()-started)/1000),"s");
    return "PageSpeed connecté : analyse mobile réussie ("+Math.round((Date.now()-started)/1000)+" s).";
  }catch(error){
    if(pageSpeedTimeout(error))throw new Error("PageSpeed : Google n’a pas terminé le test en 75 secondes. Cela ne signifie pas que la clé est invalide. Réessayez.");
    if(error instanceof Error&&(/^(PageSpeed HTTP |Google répond)/.test(error.message)))throw error;
    throw new Error("PageSpeed : erreur réseau ou réponse Google illisible. Réessayez.");
  }
}

async function testCrux(value: string): Promise<string> {
  const response = await fetch(
    `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(value)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: "https://example.com", formFactor: "PHONE" }),
      signal: AbortSignal.timeout(8000),
    }
  );

  if (response.status === 404) return "Chrome UX Report API responded successfully.";
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error?.message ? `: ${data.error.message}` : "";
    throw new Error(`Chrome UX Report returned ${response.status}${message}`);
  }
  return "Chrome UX Report responded successfully.";
}

async function testCensus(value: string): Promise<string> {
  const params = new URLSearchParams({
    get: "NAME",
    for: "zip code tabulation area:98005",
    key: value,
  });
  const response = await fetch(`https://api.census.gov/data/2022/acs/acs5?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`US Census returned ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) {
    throw new Error("US Census returned a non-JSON response. Check the API key.");
  }
  return "US Census responded successfully.";
}

async function testOpenCorporates(value: string): Promise<string> {
  const params = new URLSearchParams({
    q: "Bellevue Dental Arts",
    jurisdiction_code: "us_wa",
    per_page: "1",
    api_token: value,
  });
  const response = await fetch(`https://api.opencorporates.com/v0.4/companies/search?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`OpenCorporates returned ${response.status}`);
  return "OpenCorporates responded successfully.";
}

async function testYelp(value: string): Promise<string> {
  const url = new URL("https://api.yelp.com/v3/businesses/search");
  url.searchParams.set("term", "dentist");
  url.searchParams.set("location", "Seattle");
  url.searchParams.set("limit", "1");
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${value}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Yelp returned ${response.status}`);
  return "Yelp responded successfully.";
}

async function testAiKey(key: LocalSecretKey, value: string): Promise<string> {
  if (key === "openai_api_key") {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${value}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
    return "OpenAI responded successfully.";
  }

  if (key === "anthropic_api_key") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": value,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
    return "Anthropic responded successfully.";
  }

  if (key === "google_ai_api_key") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(value)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    return "Gemini responded successfully.";
  }

  return "No live test is needed for this setting.";
}

async function runProviderTest(key: LocalSecretKey, value: string): Promise<string> {
  if (key === "serpkite_api_key") {
    const response=await fetch("https://api.serpkite.com/v1/account",{headers:{Authorization:"Bearer "+value},signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw new Error("SerpKite returned "+response.status);
    return "SerpKite connecté.";
  }
  if (key === "google_places_api_key") return testGooglePlaces(value);
  if (key === "google_pagespeed_api_key") return testPageSpeed(value);
  if (key === "google_crux_api_key") return testCrux(value);
  if (key === "census_api_key") return testCensus(value);
  if (key === "opencorporates_api_token") return testOpenCorporates(value);
  if (key === "yelp_api_key") return testYelp(value);
  return testAiKey(key, value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { key } = await context.params;
  const definition = getProviderDefinition(key as LocalSecretKey);
  if (!definition) {
    return NextResponse.json({ error: `Unknown data source: ${key}` }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const submittedValue = typeof body?.value === "string" ? body.value.trim() : "";
  const hosted = process.env.PHANTOM_DB_BACKEND === "supabase";
  if (hosted && submittedValue) {
    return NextResponse.json(
      { error: "Hosted secrets are managed with Vercel environment variables." },
      { status: 409 },
    );
  }
  const savedValue = submittedValue || (hosted
    ? await getProviderSecret(definition.key)
    : await getSecret(definition.key));

  if (!savedValue) {
    return NextResponse.json({ error: "Enter a key before testing." }, { status: 400 });
  }

  if (submittedValue) {
    await setSecret(definition.key, definition.label, definition.provider, submittedValue);
  }

  let status: SecretStatus = "connected";
  let message = "";
  try {
    message = await runProviderTest(definition.key, savedValue);
  } catch (error) {
    status = "invalid";
    message = error instanceof Error ? error.message : "Connection test failed.";
    if(definition.key==="google_pagespeed_api_key")console.warn("[settings/pagespeed]",message);
  }

  if (!hosted) {
    await updateSecretTestStatus(definition.key, status, message);
  }
  return NextResponse.json({ status, message });
}
