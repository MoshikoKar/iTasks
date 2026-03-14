# Monitoring and Alerting

## Overview

iTasks exposes Prometheus-format metrics for scraping by a monitoring system (e.g. Prometheus, Grafana Agent). Instrumentation covers API request latency and errors, cron job execution, authentication failures, SLA notifications, and database errors.

**Metrics endpoint:** `GET /api/metrics`  
**Content-Type:** `text/plain; version=0.0.4; charset=utf-8` (Prometheus exposition format)

The endpoint is intended for scrape by monitoring infrastructure only. It does not require authentication; in production, restrict access to the metrics URL via network/firewall or reverse proxy so only the Prometheus server can reach it.

---

## Metrics Reference

### Application metrics (prefix `itasks_`)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `itasks_http_request_duration_seconds` | Histogram | `route`, `method`, `status_code` | HTTP request duration in seconds. Buckets: 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10. |
| `itasks_http_request_errors_total` | Counter | `route`, `method`, `status_code` | Number of requests that returned 5xx. |
| `itasks_cron_job_duration_seconds` | Histogram | `job` | Duration of background cron jobs. Job name: `recurring_and_notifications`. |
| `itasks_cron_job_errors_total` | Counter | `job` | Number of cron job failures. |
| `itasks_auth_failures_total` | Counter | `reason` | Authentication failures. Reasons: `invalid_password`, `invalid_credentials`, `server_error`. |
| `itasks_sla_notifications_sent_total` | Counter | `priority` | SLA due-date notifications sent (Critical, High, Medium, Low). |
| `itasks_db_errors_total` | Counter | `context` | Database-related errors in critical paths (when recorded). |

### Default Node.js metrics (prefix `itasks_`)

`prom-client` collects default metrics (CPU, event loop, heap, etc.) with the same prefix. See [prom-client default metrics](https://github.com/siimon/prom-client#default-metrics) for the full list.

---

## Integrating with Prometheus

### Scrape configuration

Add a scrape job in `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'itasks'
    metrics_path: /api/metrics
    static_configs:
      - targets: ['localhost:3000']   # or your app host:port
    scrape_interval: 15s
    scrape_timeout: 10s
```

If the app is behind a reverse proxy or load balancer, use the correct host and ensure the proxy forwards requests to the app. For multiple instances, either scrape each instance or use a single endpoint that aggregates metrics (e.g. via a sidecar or gateway).

---

## Recommended Alerts

Configure alerts in Prometheus (or Grafana) using the following as a starting point. Tune thresholds and for_window to match your SLOs.

### Auth failures

- **Alert:** High rate of authentication failures  
- **Expression (example):** `rate(itasks_auth_failures_total[5m]) > 0.5`  
- **Rationale:** May indicate brute-force attempts or misconfiguration.  
- **Action:** See runbook “Authentication failures”.

### Cron job failures

- **Alert:** Cron job errors  
- **Expression:** `increase(itasks_cron_job_errors_total[15m]) > 0`  
- **Rationale:** Recurring task generation or SLA notification scheduler failed.  
- **Action:** See runbook “Cron / background job failures”.

### API 5xx errors

- **Alert:** High 5xx rate on critical routes  
- **Expression (example):** `rate(itasks_http_request_errors_total[5m]) > 0.1`  
- **Rationale:** Backend or dependency failure.  
- **Action:** See runbook “High API error rate”.

### Database errors

- **Alert:** Database errors in critical paths  
- **Expression:** `increase(itasks_db_errors_total[5m]) > 0`  
- **Rationale:** DB connectivity or query failures.  
- **Action:** See runbook “Database errors”.

### SLA notifications (informational)

- **Expression (example):** `rate(itasks_sla_notifications_sent_total[1h])`  
- **Rationale:** Monitor volume of SLA reminders; spikes may indicate many tasks approaching due dates.  
- **Note:** SLA “breach” (e.g. overdue count) is best derived from application data or a dedicated metric if added later.

---

## Runbooks

### Authentication failures

1. Check `itasks_auth_failures_total` by `reason` in Prometheus/Grafana.
2. If `invalid_password` or `invalid_credentials` is high: possible brute force; consider rate limiting (already in place for login) and reviewing auth logs.
3. If `server_error` is high: check application logs and DB connectivity; see “Database errors” and “High API error rate” runbooks.
4. Verify LDAP/config if LDAP is in use (e.g. `lib/ldap`, login route).

### Cron / background job failures

1. Confirm alert is from `itasks_cron_job_errors_total{job="recurring_and_notifications"}`.
2. Check application logs for `[Cron]` messages and stack traces.
3. Verify DB connectivity and that advisory lock is not stuck (PostgreSQL `pg_try_advisory_lock`); restart app if a crashed instance left the lock held.
4. Check recurring task generation and notification scheduler: `generateRecurringTasks`, `sendDueDateNotifications` (see `lib/cron.ts`, `lib/notification-scheduler.ts`).
5. If mail sending fails, check SMTP configuration and logs from `sendMail`.

### High API error rate

1. Identify routes with high `itasks_http_request_errors_total` (by `route`, `method`, `status_code`).
2. Check application logs for the same time window; look for unhandled exceptions and 500 responses.
3. Verify database connectivity and pool/connection limits.
4. Check external dependencies (LDAP, SMTP, etc.) if errors correlate with specific routes.

### Database errors

1. Check `itasks_db_errors_total` by `context` to see which path reported the error.
2. Verify PostgreSQL is up and reachable; check connection limits and disk.
3. Review application logs for Prisma/DB stack traces.
4. If errors persist, consider failover, scaling, or query optimization as per operational procedures.

---

## Liveness and readiness

For process and DB health, use the health endpoint when implemented (see Production M1 in the project TODO). The metrics endpoint is for observability and is not a substitute for a dedicated liveness/readiness probe.

---

## Extending instrumentation

- **New API routes:** Wrap handlers with `withApiMetrics(handler, { route: "/api/your/route" })` from `lib/metrics.ts`.
- **New cron jobs:** Use `startCronTimer("job_name")` and `recordCronError("job_name")` in `lib/cron.ts`.
- **Auth failures:** Call `recordAuthFailure(reason)` from auth code (e.g. login route).
- **DB errors:** Call `recordDbError(context)` in catch blocks where the error is known to be DB-related.
- **SLA notifications:** `recordSlaNotificationSent(priority)` is already called from the notification scheduler when a due-date email is sent.

All metrics are defined in `lib/metrics.ts` and exposed at `GET /api/metrics`.
