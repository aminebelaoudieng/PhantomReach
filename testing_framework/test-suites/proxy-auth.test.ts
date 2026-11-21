import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("hosted access proxy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("leaves local development unprotected when credentials are absent", () => {
    const response = proxy(new NextRequest("http://localhost/audits"));
    expect(response.status).toBe(200);
  });

  it("fails closed on Vercel when credentials are absent", () => {
    vi.stubEnv("VERCEL", "1");
    const response = proxy(new NextRequest("https://example.vercel.app/audits"));
    expect(response.status).toBe(503);
  });

  it("requires and accepts configured Basic credentials", () => {
    vi.stubEnv("APP_ACCESS_USERNAME", "tester");
    vi.stubEnv("APP_ACCESS_PASSWORD", "secret-password");
    const unauthorized = proxy(new NextRequest("https://example.vercel.app/audits"));
    expect(unauthorized.status).toBe(401);

    const authorization = `Basic ${Buffer.from("tester:secret-password").toString("base64")}`;
    const authorized = proxy(new NextRequest("https://example.vercel.app/audits", {
      headers: { authorization },
    }));
    expect(authorized.status).toBe(200);
  });

  it("keeps the health endpoint public", () => {
    vi.stubEnv("VERCEL", "1");
    const response = proxy(new NextRequest("https://example.vercel.app/api/health"));
    expect(response.status).toBe(200);
  });
});

