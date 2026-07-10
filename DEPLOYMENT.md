# Deployment

## Container images

Both services build as multi-stage Docker images:

- **backend** (`backend/Dockerfile`): `deps` → `build` (tsc) → `prod-deps` → slim
  `node:20-alpine` runtime running as a non-root user, with `prisma migrate deploy`
  run automatically by `docker-entrypoint.sh` before the server starts.
- **frontend** (`frontend/Dockerfile`): Vite production build → static assets served
  by `nginx:alpine`, with SPA-aware routing (`try_files ... /index.html`) so deep
  links like `/links/:id/analytics` work on a hard refresh.

## Environment variables

| Variable | Service | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string |
| `REDIS_URL` | backend | Redis connection string |
| `BASE_URL` | backend | Public origin used to build `shortUrl` values — **must** be the externally-reachable URL, not the internal Docker service name |
| `FRONTEND_ORIGIN` | backend | Allowed CORS origin for the dashboard |
| `SHORT_CODE_LENGTH` | backend | Auto-generated short code length (default 7) |
| `VITE_API_BASE_URL` | frontend (build-time) | API origin baked into the static bundle |

`VITE_API_BASE_URL` is a Vite build-time variable — it must be supplied as a Docker
build arg (see `docker-compose.yml`'s `frontend.build.args`), not a runtime env var,
since Vite inlines it into the JS bundle at build time.

## Production considerations

- **Database migrations** run automatically on backend container start
  (`prisma migrate deploy`), which is safe to run repeatedly (no-op if already
  applied) — suitable for rolling restarts.
- **Redis is a cache, not a dependency for correctness.** If Redis is unreachable,
  the redirect handler logs a warning and falls back to Postgres directly; the
  service degrades in latency, not in correctness.
- **Horizontal scaling:** the backend is stateless (all state in Postgres/Redis), so
  multiple backend replicas behind a load balancer work without any code changes.
  Redis is shared across replicas, so cache invalidation on a write from one replica
  is immediately visible to the others.
- **Health check:** `GET /health` is wired into the backend's Docker healthcheck and
  is suitable for a load balancer / orchestrator liveness probe.
- **Trusted proxy hops:** the backend calls `app.set("trust proxy", 1)`, telling
  Express to resolve `req.ip` (used for GeoIP/analytics) from exactly one hop of
  `X-Forwarded-For` — matching the single reverse-proxy topology shipped in
  `docker-compose.yml`. If you put this behind additional infrastructure (e.g. a
  CDN in front of a load balancer in front of the container), update that value to
  match the real hop count, or client IPs become spoofable / analytics become
  attributable to the wrong hop.
- **Secrets:** `.env` files are gitignored; `docker-compose.yml` uses inline
  environment values suitable for local/demo use only — a real deployment should
  inject `DATABASE_URL`/`REDIS_URL` via the orchestrator's secret store rather than
  the compose file.
- **TLS/reverse proxy:** neither container terminates TLS; a real deployment sits
  both behind a reverse proxy (nginx/Caddy/cloud load balancer) that handles
  HTTPS termination and forwards `X-Forwarded-For` (already read by the backend
  for GeoIP lookups).
