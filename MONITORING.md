# Fiesta'26 Live — Monitoring, Backups & Incident Runbook

## 1. 1-Minute Uptime Monitoring
Point a free uptime monitor (Better Stack / UptimeRobot / Freshping) at:
- `GET https://<your-domain>/api/health`
- Interval: **1 minute**
- Expected: HTTP `200` and JSON containing `"status":"ok"` and `"db":"ok"`.
- Alert target: Fest tech owner phone (SMS / WhatsApp / push).

## 2. What to Watch on Fest Days (25–27 Nov)
- **Vercel Dashboard**: Function duration, 5xx count (must stay < 0.5%).
- **Supabase → Reports → API**: Read requests should stay **~1 req/sec or lower** during crowd surges because `/`, `/events`, `/api/live`, and `/api/vote/[id]` are edge-cached (`s-maxage=5..30`).
- **Safety Panel (`/admin/safety`)**: Live DB ping latency, active rate-limiter tier (`upstash` / `database` / `memory`), push queue depth, and recent audit entries.

## 3. Vercel Firewall & Attack Challenge Mode
1. In Vercel → Project → Firewall → Rules, add a rate limit rule:
   - Path starts with `/api/` → **120 requests per 60 seconds per IP** → Deny (429).
2. Under active bot flood, toggle **Attack Challenge Mode** ON in Vercel Firewall and toggle **Pause votes & stamps** ON in `/admin/safety`.

## 4. Restoring a Nightly Backup
Download `fiesta26-backup.dump` from GitHub Actions → Nightly Supabase Backup, then restore to a clean or staging database:
```bash
pg_restore --clean --if-exists --no-owner --no-acl -d "$SUPABASE_DB_URL" fiesta26-backup.dump
```
