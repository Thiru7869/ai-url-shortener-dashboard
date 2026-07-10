# Project Report — LinkPilot (Assignment 7: AI-Powered URL Shortener Dashboard)

## Project Summary

LinkPilot is a full-stack URL shortening platform for internal marketing campaigns.
Users create short links (with optional custom aliases and expiry dates) through a
React dashboard, track click activity in real time, and drill into per-link analytics
(daily trend, browser/device/country distribution, top referrers). The redirect path
is optimized for sub-100ms responses via a Redis cache-aside layer, while PostgreSQL
remains the single source of truth for all data. The project was built end to end —
schema, API, dashboard, tests, Docker packaging, and documentation — as a single
autonomous implementation pass following an approved architecture plan, followed by
a dedicated production-readiness audit pass (see [AUDIT_REPORT.md](./AUDIT_REPORT.md))
that re-verified every requirement, fixed real issues it found (redundant DB index,
IP-spoofable analytics, non-atomic click writes, missing modal accessibility, an
oversized JS bundle), and re-ran every verification gate end to end.

## Folder Structure

```
url-shortener/
├── backend/                    Express + TypeScript API
│   ├── src/{config,routes,controllers,services,middleware,validators,utils}
│   ├── prisma/{schema.prisma,migrations,seed.ts}
│   ├── tests/{unit,integration}
│   └── Dockerfile, docker-entrypoint.sh
├── frontend/                   React + TypeScript dashboard
│   └── src/{api,hooks,components,components/charts,pages,types}
│   └── Dockerfile, nginx.conf
├── docs/{approach,architecture,tradeoffs,prompts}.md
├── postman/url-shortener.postman_collection.json
├── docker-compose.yml
├── README.md, API.md, SETUP.md, DEPLOYMENT.md
└── PROJECT_REPORT.md (this file)
```

## Architecture

Layered backend (routes → controllers → services → Prisma), with Redis used only as
a cache-aside layer on the redirect hot path (never as the primary store). The
frontend is a Vite/React SPA using React Query for server state and polling-based
freshness. Full component/data-flow/sequence/ER diagrams are in
[docs/architecture.md](./docs/architecture.md).

## Technology Stack

- **Backend:** Node.js 20, TypeScript, Express 4, Prisma 5, PostgreSQL 16, Redis 7, Zod, Helmet, express-rate-limit, Pino
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Query 5, React Hook Form, Recharts, react-router-dom
- **Testing:** Jest + Supertest (backend), Vitest + React Testing Library (frontend)
- **Infra:** Docker, Docker Compose, nginx (static frontend serving)

## Implemented Features

- Short link creation with optional custom alias and expiry date
- Automatic unique short-code generation (nanoid, unambiguous alphabet, collision retry)
- Graceful duplicate-alias handling (`409 Conflict` with a field-level message)
- Full CRUD + enable/disable + soft delete for links
- Search (title / original URL / short code) and status filtering, paginated
- Redirect endpoint with Redis cache-aside, async click logging, GeoIP + UA parsing
- Per-link analytics: total clicks, daily trend, top referrers, browser/device/country distribution
- Dashboard stats: total links, total clicks, active links, expired links (auto-refreshing)
- Fully responsive SPA dashboard with no full-page reloads

## Performance Optimizations

- Redis cache-aside for the redirect hot path — measured ~5-20ms (warm cache) / ~40-60ms (cold cache), both well under the 100ms p99 constraint, verified locally and again inside the Dockerized stack
- Click logging is fire-and-forget, executed **after** the redirect response is sent (and wrapped in a `prisma.$transaction` so the click log and the counter can't drift from each other), so database latency never affects redirect response time
- `Link.clickCount` is a denormalized counter (avoids `COUNT(*)` over the `Click` table for dashboard/table reads)
- GeoIP/User-Agent parsing done in-process (no network calls) to keep the redirect path fast
- Targeted composite DB indexes matching the actual query shapes (`[deletedAt, createdAt/status/expiresAt]`), with the earlier redundant `shortCode` index (duplicate of its `@unique` index) removed
- Analytics page (and its Recharts dependency) code-split into its own on-demand chunk, cutting the initial dashboard bundle from ~792KB to ~377KB raw

## Security Features

- Zod validation on every mutating endpoint (URL scheme allow-list, alias character allow-list, title length limits)
- Helmet security headers, CORS restricted to the configured frontend origin
- Rate limiting on both the general API and the redirect endpoint
- Prisma parameterized queries throughout (no raw string interpolation) — SQL-injection safe
- React's default output escaping + strict input validation — XSS safe
- IP addresses are hashed (SHA-256) before storage, never stored raw, and resolved via Express's `trust proxy`-aware `req.ip` (scoped to one hop) rather than a client-spoofable raw header
- Non-root user in the backend production container
- Process-level `unhandledRejection`/`uncaughtException` handlers as a safety net outside the request/response cycle

## Testing Summary

- **Backend:** 57 tests (Jest + Supertest) across 7 suites — unit tests for short-code generation, Zod validators, and status-derivation logic; integration tests for the full link CRUD API, the redirect endpoint (cache hit/miss, disabled/expired handling, cache invalidation), and analytics aggregation, run against a real PostgreSQL + Redis. **~90% statement coverage.**
- **Frontend:** 15 tests (Vitest + Testing Library, using `@testing-library/user-event` for realistic interaction simulation) covering status badges, pagination, distribution charts, and form validation (including client-side URL/title/alias validation errors).
- **Manual/E2E verification:** full create → search → redirect → click-tracking → dashboard-stats → analytics flow verified in a real browser session (Puppeteer-driven, screenshots captured), plus two full `docker compose up --build` runs verified end to end — the second one specifically re-verifying every fix from the follow-up audit (see `AUDIT_REPORT.md`).
- All four quality gates (`typecheck`, `lint`, `test`, `build`) pass cleanly for both packages.

## Requirement Compliance

| Requirement | Status |
|---|---|
| Create short URL from any valid URL | ✔ Implemented |
| Optional expiration date | ✔ Implemented |
| Optional custom alias | ✔ Implemented |
| View all created short links | ✔ Implemented |
| Search links by title or original URL | ✔ Implemented |
| Disable or enable a short link | ✔ Implemented |
| View click analytics for every link | ✔ Implemented |
| Redirect to original URL on short-URL open | ✔ Implemented |
| Record visit: timestamp | ✔ Implemented |
| Record visit: browser | ✔ Implemented |
| Record visit: OS | ✔ Implemented |
| Record visit: country (free API or mock) | ✔ Implemented (local GeoIP) |
| Record visit: referrer | ✔ Implemented |
| API: Create Short URL | ✔ Implemented |
| API: Update Short URL | ✔ Implemented |
| API: Delete Short URL | ✔ Implemented (soft delete) |
| API: Get Link Details | ✔ Implemented |
| API: Redirect Endpoint | ✔ Implemented |
| API: Analytics Endpoint | ✔ Implemented |
| Store all data in a database | ✔ Implemented (PostgreSQL via Prisma) |
| Generate unique short codes automatically | ✔ Implemented (nanoid + collision retry) |
| Handle duplicate custom aliases gracefully | ✔ Implemented (409 with message) |
| Dashboard: Total/Active/Expired Links, Total Clicks tiles | ✔ Implemented |
| Links table with all specified columns | ✔ Implemented |
| Actions: Copy, Edit, Disable, Delete, View Analytics | ✔ Implemented |
| Create Link modal with all specified fields | ✔ Implemented |
| Analytics page: Total Clicks, Daily Chart, Referrers, Browser/Device/Country | ✔ Implemented |
| Redirect response time under 100ms | ✔ Verified (~5-40ms) |
| Pagination implemented | ✔ Implemented |
| Soft delete only | ✔ Implemented |
| Input validation mandatory | ✔ Implemented (Zod, both tiers) |
| Short URLs remain unique | ✔ Implemented (DB constraint + app-level check) |
| Dashboard works without page refreshes | ✔ Implemented (SPA) |
| Complete frontend and backend application | ✔ Implemented |
| Database schema | ✔ Implemented (Prisma schema + migration) |
| Docker Compose | ✔ Implemented and verified end to end |
| Unit tests | ✔ Implemented (72 total, ~90% backend coverage) |
| API documentation | ✔ Implemented (API.md + Postman collection) |
| docs/approach.md | ✔ Implemented |
| docs/architecture.md | ✔ Implemented (with Mermaid diagrams) |
| docs/tradeoffs.md | ✔ Implemented |
| docs/prompts.md | ✔ Implemented |

**Every requirement in the assignment specification is implemented and verified.**

## Future Improvements

- Add lightweight admin authentication (the assignment doesn't require it, but a public write API is a soft target in a real deployment)
- Pre-warm the Redis cache on link creation rather than waiting for the first redirect
- Add latency histograms/metrics for the redirect path instead of manual timing checks
- Roll up click analytics into a materialized aggregate table if click volume grows significantly
- Add a retention/archival job for `Click` rows belonging to soft-deleted links

## Known Limitations

- No authentication/authorization layer (not required by the assignment spec, which describes an internal tool with no auth requirement)
- GeoIP data is a local point-in-time snapshot (`geoip-lite`), not a live, continuously-updated service — acceptable for internal analytics, not for compliance-grade geolocation
- Click write is fire-and-forget after the redirect response (though the click log and counter are written atomically as a pair — see `docs/tradeoffs.md`); a crash in the narrow window between sending the redirect and completing the write could still drop a click count
- `Click` rows for a soft-deleted link are retained indefinitely — no TTL/archival job exists yet
