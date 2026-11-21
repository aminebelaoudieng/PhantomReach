import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl } from "@/lib/security/public-http-url";

describe("public HTTP URL guard", () => {
  it("accepts a public HTTPS IP address", async () => {
    await expect(assertPublicHttpUrl("https://93.184.216.34/path")).resolves.toBeUndefined();
  });

  it.each([
    "http://127.0.0.1/admin",
    "http://10.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
  ])("blocks private or metadata destination %s", async (url) => {
    await expect(assertPublicHttpUrl(url)).rejects.toThrow(/Blocked|private|reserved/);
  });

  it("blocks embedded credentials", async () => {
    await expect(assertPublicHttpUrl("https://user:pass@93.184.216.34/")).rejects.toThrow(
      "embedded credentials",
    );
  });

  it("blocks non-HTTP protocols", async () => {
    await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow("Only http");
  });
});

