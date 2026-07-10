# Approach

## How I understood the problem

Assignment 7 asks for a complete, production-quality URL shortener with a management
dashboard — not just a redirect service. Reading the PDF closely, three things stood
out as the actual hard requirements behind the feature list:

1. **The redirect path is the product.** Everything else (dashboard, analytics,
   search) is admin tooling around a single hot endpoint that has to survive real
   traffic. The explicit `<100ms` redirect constraint and "store all data in a
   database" constraint together imply a cache-aside design, not just an ORM query
   per redirect.
2. **Analytics has to be truthful, not decorative.** The spec asks for real
   dimensions — browser, OS, device, country, referrer, day-by-day trend — pulled
   from a `Click` fact table, not fabricated counters.
3. **Every mutation needs to be safe by default.** Soft delete, alias-collision
   handling, input validation, and status semantics (active vs. disabled vs. expired)
   all needed one unambiguous rule each, because the frontend has to render three
   overlapping states (a link can be disabled *and* expired at the same time) without
   the UI contradicting itself.

## Plan

1. Design the data model and API first (`Link` + `Click`, one row per visit) so
   analytics could be derived rather than bolted on.
2. Build the backend as a layered Express app (routes → controllers → services →
   Prisma) with Zod validation at the edge and Redis only in the redirect hot path,
   per the constraint that Redis must not replace Postgres as the source of truth
   here (unlike Assignment 1, this spec asks for "store all data in a database" with
   no in-memory/Redis-primary requirement, so Redis is a cache, not the ledger).
3. Write integration tests against a real Postgres + Redis (not mocks) so the tests
   exercise the same cache-aside and soft-delete logic production traffic would hit.
4. Build the React dashboard against the finished API, matching the spec's exact
   page inventory (stat tiles, links table with the five actions, create/edit modal,
   analytics page with the five listed visualizations).
5. Containerize both services, verify the whole stack via `docker compose up` end to
   end (not just "the Dockerfile builds"), then write documentation last, once the
   real architecture was known rather than planned.

## Assumptions

- "Handle duplicate custom aliases gracefully" means return a clear `409 Conflict`
  with a field-level message, not silently rename or auto-suffix the alias — a
  marketing user picking a specific alias needs to know it's taken.
- "Expired Links" and "Disabled" are distinct, non-overlapping display states in the
  UI; an expired-and-disabled link displays as **Expired** (time-based state takes
  priority since it's the more permanent, unappealable one).
- Country lookup was implemented via a local GeoIP database (`geoip-lite`) rather
  than a live third-party API — the spec explicitly allows "any free API or mock
  implementation," and a network call on the redirect hot path would directly
  conflict with the `<100ms` constraint.
- "No page refresh" was implemented as a client-side-routed SPA with React Query
  polling the dashboard stats every 15s, rather than a websocket — the spec's own
  latency budget for this feature (unlike the real-time notification assignment) is
  not sub-second, and polling is the simplest thing that satisfies it.

## Task breakdown

Tracked as 14 discrete tasks end to end: repo/Prisma scaffold → backend core
(config/middleware/validation) → link CRUD → redirect + caching → analytics/
dashboard stats → backend tests → frontend scaffold/API client → dashboard UI →
analytics UI → Docker + compose → Postman collection → full quality gate → docs →
final self-review and compliance report. See `PROJECT_REPORT.md` at the repo root for
the finished state of each.
