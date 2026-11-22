/**
 * Module 3: Website Performance & Technical Grade
 * Tool: run_pagespeed_audit
 */

import { pageSpeedError,pageSpeedTimeout } from "@/lib/config/pagespeed-response";
import { auditIds } from "@/lib/grow/website-details";
import type { WebsitePerformanceResult } from "@/lib/db/types";
import { getProviderSecret } from "@/lib/config/provider-config";
import { unavailable, type UnavailableResult } from "./unavailable";

interface PageSpeedParams {
  url: string;
  strategy?: "mobile" | "desktop";
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export async function runPageSpeedAudit(
  params: PageSpeedParams
): Promise<{ analysis: WebsitePerformanceResult; rawLighthouse?: any } | UnavailableResult> {
  const strategy=params.strategy??"mobile";
  const apiKey = await getProviderSecret("google_pagespeed_api_key");
  console.info("[grow/pagespeed] starting",strategy);

  if (!apiKey) {
    console.warn("[grow/pagespeed] missing configured key");
    return unavailable(
      "pagespeed",
      "missing_api_key",
      "Set GOOGLE_PAGESPEED_API_KEY to collect real PageSpeed Insights data."
    );
  }

  try {
    const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    url.searchParams.set("url", params.url);
    url.searchParams.set("strategy", strategy);
    url.searchParams.set("key", apiKey);
    for (const category of ["performance", "accessibility", "seo", "best-practices"]) {
      url.searchParams.append("category", category);
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(75000),
      cache:"no-store",
    });

    if(!response.ok){const reason=await pageSpeedError(response);console.warn("[grow/pagespeed]",strategy,reason);return unavailable("pagespeed",response.status===429||response.status===403?"blocked":"failed",reason); }

    const data = await response.json();
    const lighthouseResult = data.lighthouseResult;
    if (!lighthouseResult || lighthouseResult.runtimeError) {
      console.warn("[grow/pagespeed]",strategy,"no usable result",lighthouseResult?.runtimeError?.code??"missing");
      return unavailable("pagespeed","failed","Le test n’a pas produit de résultat exploitable.");
    }

    const categories = lighthouseResult.categories || {};
    const audits = lighthouseResult.audits || {};

    if(typeof categories.performance?.score!=="number"||typeof categories.seo?.score!=="number")return unavailable("pagespeed","failed","PageSpeed scores unavailable.");
    const performanceScore = Math.round(categories.performance.score * 100);
    const accessibilityScore = Math.round((categories.accessibility?.score || 0) * 100);
    const seoScore = Math.round((categories.seo?.score || 0) * 100);
    const bestPracticesScore = Math.round((categories["best-practices"]?.score || 0) * 100);

    const lcp = audits["largest-contentful-paint"]?.numericValue;
    const cls = audits["cumulative-layout-shift"]?.numericValue;
    const inp = audits["interaction-to-next-paint"]?.numericValue;

    const lcpPass = lcp ? lcp <= 2500 : false;
    const clsPass = cls ? cls <= 0.1 : false;
    const inpPass = inp ? inp <= 200 : false;
    const sslValid = params.url.startsWith("https://") || audits["is-on-https"]?.score === 1;
    const totalByteWeight = audits["total-byte-weight"]?.numericValue;
    const pageWeightMb = totalByteWeight
      ? Math.round((totalByteWeight / 1024 / 1024) * 100) / 100
      : undefined;
    const hasSchemaMarkup = audits["structured-data"]?.score === 1 || false;
    const viewportScore = audits["viewport"]?.score;
    const fontSizeScore = audits["font-size"]?.score;
    const mobileFriendly = viewportScore === 1 && (fontSizeScore === undefined || fontSizeScore === 1);

    const compositeScore = Math.round(
      performanceScore * 0.35 +
        accessibilityScore * 0.2 +
        seoScore * 0.25 +
        bestPracticesScore * 0.2
    );

    const findings: string[] = [];
    const recommendations: string[] = [];

    if (performanceScore < 50) {
      findings.push(`Performance score of ${performanceScore}/100 is critically low`);
      recommendations.push("Address performance issues urgently; slow sites lose mobile visitors");
    } else if (performanceScore < 90) {
      findings.push(`Performance score of ${performanceScore}/100 has room for improvement`);
    }

    if (!lcpPass && lcp) {
      findings.push(`Largest Contentful Paint (${(lcp / 1000).toFixed(1)}s) exceeds 2.5s threshold`);
      recommendations.push("Optimize the largest content element, compress images, and defer non-critical resources");
    }
    if (!clsPass && cls) {
      findings.push(`Cumulative Layout Shift (${cls.toFixed(3)}) exceeds 0.1 threshold`);
      recommendations.push("Set explicit width and height on images and ads to prevent layout shift");
    }
    if (!sslValid) {
      findings.push("Website is not served over HTTPS");
      recommendations.push("Install an SSL certificate immediately");
    }
    if (pageWeightMb && pageWeightMb > 3) {
      findings.push(`Page weight of ${pageWeightMb}MB is excessive (target: under 2MB)`);
      recommendations.push("Compress images, enable text compression, and remove unused code");
    }
    if (accessibilityScore < 70) {
      findings.push(`Accessibility score of ${accessibilityScore}/100 needs attention`);
      recommendations.push("Improve accessibility with alt text, heading hierarchy, and color contrast");
    }
    if (seoScore < 80) {
      findings.push(`SEO score of ${seoScore}/100 is below best practices`);
      recommendations.push("Add meta descriptions, clean heading structure, and structured data");
    }

    const analysis: WebsitePerformanceResult = {
      grade: scoreToGrade(compositeScore),
      score: compositeScore,
      url: params.url,
      performance_score: performanceScore,
      accessibility_score: accessibilityScore,
      seo_score: seoScore,
      best_practices_score: bestPracticesScore,
      core_web_vitals: {
        lcp: lcp ? Math.round(lcp) : undefined,
        inp: inp ? Math.round(inp) : undefined,
        cls: cls ? Math.round(cls * 1000) / 1000 : undefined,
        lcp_pass: lcpPass,
        inp_pass: inpPass,
        cls_pass: clsPass,
      },
      mobile_friendly: mobileFriendly,
      ssl_valid: sslValid,
      page_weight_mb: pageWeightMb,
      has_schema_markup: hasSchemaMarkup,
      has_clear_cta: true,
      findings,
      recommendations,
    };

    const rawLighthouse = {
      categories,
      audits: Object.fromEntries(Object.entries(audits).filter(([id,v])=>v&&(auditIds as readonly string[]).includes(id))),
    };

    console.info("[grow/pagespeed] success",strategy,performanceScore);
    return { analysis, rawLighthouse };
  } catch (error: unknown) {
    const reason=pageSpeedTimeout(error)?"PageSpeed : délai Google de 75 secondes dépassé.":"PageSpeed : analyse indisponible ou réponse incomplète.";
    console.warn("[grow/pagespeed]",reason);
    return unavailable("pagespeed","failed",reason);
  }
}
