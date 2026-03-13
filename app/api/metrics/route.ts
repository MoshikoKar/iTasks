import { NextRequest, NextResponse } from "next/server";
import { getMetricsRegistry } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Prometheus scrape endpoint. Exposes application metrics in Prometheus text format.
 * Typically scraped by Prometheus or Grafana Agent; not intended for browser use.
 */
export async function GET(_request: NextRequest) {
  try {
    const register = getMetricsRegistry();
    const contentType = register.contentType;
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[Metrics] Failed to collect metrics:", error);
    return new NextResponse("Error collecting metrics", { status: 500 });
  }
}
