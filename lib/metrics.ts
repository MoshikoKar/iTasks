import { NextRequest, NextResponse } from "next/server";
import client, { Counter, Histogram, Registry } from "prom-client";

let registry: Registry | null = null;
let defaultMetricsRegistered = false;

function getOrCreateRegistry(): Registry {
  if (!registry) {
    registry = new client.Registry();
  }

  if (!defaultMetricsRegistered) {
    client.collectDefaultMetrics({
      register: registry,
      prefix: "itasks_",
    });
    defaultMetricsRegistered = true;
  }

  return registry;
}

const httpRequestDurationSeconds = new Histogram({
  name: "itasks_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["route", "method", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
});

const httpRequestErrorsTotal = new Counter({
  name: "itasks_http_request_errors_total",
  help: "Total number of HTTP requests that resulted in 5xx errors",
  labelNames: ["route", "method", "status_code"],
});

const cronJobDurationSeconds = new Histogram({
  name: "itasks_cron_job_duration_seconds",
  help: "Duration of background cron jobs in seconds",
  labelNames: ["job"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

const cronJobErrorsTotal = new Counter({
  name: "itasks_cron_job_errors_total",
  help: "Total number of background cron job errors",
  labelNames: ["job"],
});

const authFailuresTotal = new Counter({
  name: "itasks_auth_failures_total",
  help: "Total number of authentication failures",
  labelNames: ["reason"],
});

const slaNotificationsSentTotal = new Counter({
  name: "itasks_sla_notifications_sent_total",
  help: "Total number of SLA due-date notifications sent",
  labelNames: ["priority"],
});

const dbErrorsTotal = new Counter({
  name: "itasks_db_errors_total",
  help: "Total number of database-related errors in critical paths",
  labelNames: ["context"],
});

function registerAllMetrics() {
  const reg = getOrCreateRegistry();

  const metrics = [
    httpRequestDurationSeconds,
    httpRequestErrorsTotal,
    cronJobDurationSeconds,
    cronJobErrorsTotal,
    authFailuresTotal,
    slaNotificationsSentTotal,
    dbErrorsTotal,
  ] as client.Metric[];
  for (const metric of metrics) {
    // Avoid "A metric with the name ... has already been registered." on hot reload
    try {
      reg.registerMetric(metric);
    } catch {
      // no-op if already registered
    }
  }
}

registerAllMetrics();

export function getMetricsRegistry(): Registry {
  return getOrCreateRegistry();
}

export function recordAuthFailure(reason: string): void {
  authFailuresTotal.labels(reason).inc();
}

export function recordDbError(context: string): void {
  dbErrorsTotal.labels(context).inc();
}

export function recordSlaNotificationSent(priority: string): void {
  slaNotificationsSentTotal.labels(priority).inc();
}

export function withApiMetrics(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  options: { route: string }
): (req: NextRequest) => Promise<NextResponse> {
  const route = options.route;

  return async (req: NextRequest): Promise<NextResponse> => {
    const start = process.hrtime.bigint();
    let statusCode = 500;

    try {
      const res = await handler(req);
      statusCode = res.status;
      return res;
    } catch (error) {
      statusCode = 500;
      httpRequestErrorsTotal
        .labels(route, req.method, String(statusCode))
        .inc();
      throw error;
    } finally {
      const end = process.hrtime.bigint();
      const durationSeconds = Number(end - start) / 1e9;

      httpRequestDurationSeconds
        .labels(route, req.method, String(statusCode))
        .observe(durationSeconds);

      if (statusCode >= 500) {
        httpRequestErrorsTotal
          .labels(route, req.method, String(statusCode))
          .inc();
      }
    }
  };
}

export function startCronTimer(job: string): () => void {
  const endTimer = cronJobDurationSeconds.startTimer({ job });
  return () => {
    endTimer();
  };
}

export function recordCronError(job: string): void {
  cronJobErrorsTotal.labels(job).inc();
}

