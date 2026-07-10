# Audit Report — LinkPilot (Assignment 7)

A follow-up production-readiness audit of the completed Assignment 7 implementation:
re-verify every requirement against the spec, search the codebase for dead
code/security/performance/accessibility gaps, fix what's found, and re-run every
verification gate end to end (including a full `docker compose up --build`).

## Method

Two independent Explore-agent audits were run against the existing codebase (given
only file paths and a skeptical brief, not a summary of the original implementation)
to avoid rubber-stamping the first pass: one covering dead code / unused
dependencies / duplication, one covering backend security & error handling plus
frontend accessibility. Findings below are only the ones that survived scrutiny —
several suspected issues (SQL injection, open redirect, CORS wildcard, missing rate
limits on writes, unlabeled form inputs) were checked and confirmed already handled
correctly, and are not repeated here.

## Requirement Compliance Matrix

| Requirement | Status | Notes |
|---|---|---|
| Create short URL from any valid URL | ✔ | Zod `http(s)://` scheme validation |
| Optional expiration date | ✔ | Future-date validation, both tiers |
| Optional custom alias | ✔ | 409 on collision |
| View all created short links | ✔ | Paginated table |
| Search by title or original URL | ✔ | Case-insensitive `contains` |
| Disable / enable a short link | ✔ | `PATCH /:id/status`, cache-invalidated |
| View click analytics for every link | ✔ | Daily trend + 4 distributions |
| Redirect + record visit metadata | ✔ | Timestamp, browser, OS, device, country, referrer |
| API: Create/Update/Delete/Get/Redirect/Analytics | ✔ | All 6 present |
| Store all data in a database | ✔ | PostgreSQL via Prisma; Redis is cache-only |
| Auto-generate unique short codes | ✔ | nanoid + collision retry (bounded) |
| Handle duplicate aliases gracefully | ✔ | `409` with field-level message, no crash |
| Dashboard: 4 stat tiles | ✔ | Total/Active/Expired Links, Total Clicks |
| Links table: all specified columns + actions | ✔ | Title/URL/Short URL/Status/Clicks/Created/Actions |
| Create Link modal: all specified fields | ✔ | Title, URL, Alias, Expiry |
| Analytics page: all 5 specified views | ✔ | Total Clicks, Daily Chart, Referrers, Browser, Device, Country |
| Redirect < 100ms | ✔ | ~5-20ms warm / ~40-60ms cold, verified locally **and** inside Docker |
| Pagination | ✔ | Links list |
| Soft delete only | ✔ | `deletedAt`, no hard deletes via API |
| Input validation mandatory | ✔ | Zod backend + Zod frontend forms |
| Short URLs remain unique | ✔ | DB unique constraint + app-level check |
| No page refreshes | ✔ | SPA, verified via real-browser Puppeteer flow |
| Docker Compose, all 4 services healthy | ✔ | Re-verified this session, see below |
| Unit tests | ✔ | 57 backend + 15 frontend, ~90% backend coverage |
| API documentation | ✔ | `API.md` + Postman collection |
| `docs/approach.md` / `architecture.md` / `tradeoffs.md` / `prompts.md` | ✔ | All present and updated this session |

**Result: every requirement in the assignment spec is implemented and re-verified. No gaps found in Phase 1.**

## Files Modified (this audit)

**Backend**
- `backend/prisma/schema.prisma` — index cleanup (see Performance Review)
- `backend/prisma/migrations/20260709181850_refine_indexes/` — new migration
- `backend/src/app.ts` — `trust proxy` configuration
- `backend/src/server.ts` — process-level error handlers
- `backend/src/services/link.service.ts` — deduplicated the "not expired" query predicate into `notExpiredFilter()`
- `backend/src/services/redirect.service.ts` — click write now transactional
- `backend/src/utils/requestMeta.ts` — trust-proxy-aware IP resolution
- `backend/tests/unit/requestMeta.test.ts` — updated for the above

**Frontend**
- `frontend/src/hooks/useModalA11y.ts` — new shared modal accessibility hook
- `frontend/src/components/LinkFormModal.tsx`, `ConfirmDialog.tsx` — wired to the hook
- `frontend/src/pages/DashboardPage.tsx`, `AnalyticsPage.tsx` — `aria-pressed`/`aria-label` on filter controls
- `frontend/src/components/LinksTable.tsx` — descriptive `aria-label` on row actions
- `frontend/src/App.tsx` — analytics route lazy-loaded (`React.lazy` + `Suspense`)
- `frontend/src/types/link.ts` — removed unused `ApiErrorBody` export
- `frontend/src/components/LinkFormModal.test.tsx` — migrated to `@testing-library/user-event`, added an alias-validation test
- `frontend/package.json` — removed unused `clsx` dependency

**Docs**
- `docs/tradeoffs.md`, `docs/architecture.md`, `docs/prompts.md`, `README.md`, `DEPLOYMENT.md`, `PROJECT_REPORT.md` — updated to reflect the above
- `AUDIT_REPORT.md` — this file

## Bugs Found & Fixed

| # | Issue | Severity | File | Fix |
|---|---|---|---|---|
| 1 | Frontend bundle shipped as one ~792KB chunk despite Vite warning about it on every build | Moderate | `frontend/src/App.tsx` | Lazy-load the analytics route; initial bundle now ~377KB |
| 2 | `X-Forwarded-For` trusted directly from headers — client-spoofable, poisons GeoIP/analytics | Moderate | `backend/src/app.ts`, `requestMeta.ts` | `app.set("trust proxy", 1)` + use Express's resolved `req.ip` |
| 3 | Click log insert + click-count increment were two independent writes that could drift on partial failure | Minor | `backend/src/services/redirect.service.ts` | Wrapped in `prisma.$transaction` |
| 4 | Redundant DB index: `shortCode` indexed both explicitly and implicitly via `@unique` | Minor | `backend/prisma/schema.prisma` | Removed the explicit index; added two indexes that match real query shapes instead |
| 5 | No `unhandledRejection`/`uncaughtException` handlers — an error outside the request cycle had no safety net | Minor | `backend/src/server.ts` | Added both, logging + controlled exit on uncaught exceptions |
| 6 | Modals had no Escape-to-close, no focus trap, no initial focus placement | Moderate | `LinkFormModal.tsx`, `ConfirmDialog.tsx` | New `useModalA11y` hook |
| 7 | Status/day-range filter "tabs" signaled selection by color only, no `aria-pressed` | Minor | `DashboardPage.tsx`, `AnalyticsPage.tsx` | Added `aria-pressed` + `role="group"`/`aria-label` |
| 8 | Row action buttons ("Delete", "Edit", ...) had no per-row accessible name | Minor | `LinksTable.tsx` | Added descriptive `aria-label`s including the link title |
| 9 | Unused `clsx` dependency left from scaffolding | Minor | `frontend/package.json` | Removed |
| 10 | Dead `ApiErrorBody` type export, never imported | Minor | `frontend/src/types/link.ts` | Removed |
| 11 | Duplicated "is link active" filter predicate in two service functions | Minor | `backend/src/services/link.service.ts` | Extracted `notExpiredFilter()` |
| 12 | Empty, unused `backend/src/types/` directory left from initial scaffolding | Trivial | — | Removed |

No TODO/FIXME/HACK/`debugger`/commented-out code/`console.log` was found in application source (the only `console.*` calls are in `prisma/seed.ts`, a CLI script where console output is correct, not a leftover).

## Security Review

Confirmed correct (no action needed): CORS restricted to the configured frontend
origin (not `*`); Helmet security headers; 1MB JSON body limit; rate limiting on
all `/api/links` and `/api/dashboard` routes (not just the redirect endpoint); Zod
validation on every mutating endpoint including a strict `http(s)://`-only URL
scheme allow-list (blocks `javascript:`/`data:` payloads); Prisma parameterized
queries throughout, including the one raw SQL query (`$queryRaw` with tagged-template
parameterization, not string concatenation); IP addresses hashed (SHA-256) before
storage, never stored raw; non-root user in the backend production container; no
secrets committed or hardcoded (`.env` gitignored, `.env.example` files contain only
placeholder values).

Fixed this session: IP-spoofing gap (#2 above) and the missing process-level error
handlers (#5).

Remaining, accepted risk (documented, not fixed — out of scope for this
assignment's requirements): no authentication/authorization layer. The spec
describes an internal tool and does not list auth as a requirement (unlike
Assignments 4 and 8); every `/api/*` route is currently open. Flagged in
`docs/tradeoffs.md` as the top item for a real deployment.

## Performance Review

- Redirect latency re-measured after all fixes: ~5-20ms warm cache, ~40-60ms cold
  cache, both locally and inside the rebuilt Docker stack — comfortably under the
  100ms constraint.
- Fixed the redundant index and added two composite indexes actually matching the
  app's query patterns (see Bug #4).
- Fixed the oversized single-chunk bundle via route-level code-splitting (Bug #1) —
  the single biggest, most avoidable finding in this audit, since Vite's own build
  output had been warning about it since the very first build in the prior session.
- `Link.clickCount` denormalization (avoids `COUNT(*)` on every dashboard load) was
  already correct from the original build — confirmed, not changed.

## Accessibility Review

Fixed: modal focus trap/Escape/initial-focus (#6), `aria-pressed` on toggle-style
filter buttons (#7), per-row `aria-label`s on ambiguous action buttons (#8).
Confirmed already correct: form inputs correctly associated via `htmlFor`/`id`;
`StatusBadge` conveys state via text, not color alone; default browser focus
outlines are intact (not stripped by Tailwind resets).

## Documentation Review

All required docs present and updated to reflect this session's changes:
`README.md`, `API.md`, `SETUP.md`, `DEPLOYMENT.md`, `PROJECT_REPORT.md`, and all
four `docs/*.md` files. `docs/prompts.md` documents this audit pass itself,
including the mistakes it found in the original build — see that file for the full,
honest account rather than a sanitized summary.

## Verification Re-run (this session)

- Backend: `typecheck` ✔, `lint` ✔ (0 warnings), `test` ✔ (57/57, ~90% coverage), `build` ✔
- Frontend: `typecheck` ✔, `lint` ✔ (0 errors, 3 pre-existing informational warnings unrelated to this audit), `test` ✔ (15/15), `build` ✔ (bundle now split into two chunks, neither over the 500KB warning threshold)
- Docker: full `docker compose up --build` equivalent (see note below) — Postgres, Redis, backend, and frontend all reported `healthy`; re-ran the entire API surface end to end (create/list/search/filter/get/update/enable/disable/analytics/soft-delete/redirect-cache-hit/redirect-cache-miss/redirect-404/redirect-410) plus the frontend's SPA routing and CORS preflight — all correct.

*Note on Docker verification ports:* this dev machine already has an unrelated
project's Postgres container bound to host port 5432. To avoid interfering with it,
verification was run with the same `docker-compose.yml` on remapped host ports
(`5434`/`6381`/`4001`/`5174` instead of `5432`/`6379`/`4000`/`5173`) via a
docker-compose file identical to the shipped one except for those port numbers —
internal service-to-service networking, image builds, health checks, and
`prisma migrate deploy` on container start are all unaffected by this and were
verified exactly as they'd run with the shipped file's default ports.

## Production Readiness Score

**9.2 / 10**

Breakdown: functional completeness 10/10 (every requirement implemented and
verified), correctness/testing 9/10 (57+15 tests, ~90% backend coverage, real
integration tests against real Postgres/Redis, real-browser E2E verification),
security 9/10 (all standard protections in place; no auth layer, which is
explicitly out of scope for this assignment), performance 9/10 (100ms constraint
met with margin, indexes now match query patterns, bundle now code-split),
accessibility 8.5/10 (modals and filters fixed; a full WCAG audit — color contrast
ratios, screen-reader testing with an actual AT — wasn't performed), operational
readiness 9/10 (health checks, graceful shutdown, process-level error handlers,
non-root containers; no metrics/tracing yet).

## Remaining Risks

- No authentication — accepted, out of spec, documented.
- No metrics/alerting on Redis availability, redirect p99, or click-write failures — the code degrades gracefully (see `docs/tradeoffs.md`) but degradation is currently silent outside the logs.
- `Click` rows for soft-deleted links have no retention policy — unbounded growth over a long deployment lifetime.
- No full WCAG conformance audit (contrast ratios, actual screen-reader testing) — only the specific gaps found by this audit were fixed.
- The frontend bundle, while now split, still has no CDN/immutable-caching story beyond nginx's basic `Cache-Control` header for `/assets/`.
