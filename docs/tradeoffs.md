# Trade-offs

## Redis cache-aside vs. Redis-as-source-of-truth

**Chosen:** Postgres is the source of truth for every field; Redis holds a
denormalized `{originalUrl, status, expiresAt}` blob per short code with a 6-hour
TTL, refreshed on write and read.

**Alternative considered:** Keep the hot fields permanently in Redis and treat it as
authoritative (Assignment-1 style), writing to Postgres asynchronously.

**Why not:** The spec for this assignment explicitly requires "store all data in a
database," and admin actions (disable, edit, delete) need read-your-writes
consistency in the dashboard — a marketing user disabling a link should never see it
still resolve for a stale cache window. Cache-aside with synchronous invalidation on
every mutation gives that guarantee while still keeping the redirect path off
Postgres on the common path.

**Cost:** A cold cache (first hit after a 6h TTL expiry, or right after a fresh
deploy) pays one Postgres read (~15-40ms locally) instead of a Redis read (~1-5ms).
Measured locally: warm-cache redirects average ~5ms, cold-cache redirects ~40ms —
both comfortably under the 100ms constraint, but the constraint is explicitly a p99,
so a full production rollout should pre-warm frequently-hit codes or shorten the TTL
tradeoff in the other direction if cold-cache p99 ever becomes marginal.

## Fire-and-forget click logging vs. awaited write

**Chosen:** `res.redirect()` is called first; the `Click` insert and `clickCount`
increment happen in an un-awaited promise afterward, with errors caught and logged
but never surfaced to the visitor.

**Alternative considered:** Await the click write before redirecting, so a failure
could be handled (retried, alerted) synchronously.

**Why not:** A slow or momentarily unavailable Postgres write would otherwise
directly inflate redirect latency — the one metric this assignment puts a hard
number on. The trade is that a click can theoretically be lost if the process
crashes in the small window between sending the redirect and the insert completing.
For a marketing-analytics use case (approximate counts, not billing-grade
accounting) that's an acceptable loss; for a billing-critical click-through system
it would not be, and the fix would be a durable local queue (e.g. an outbox table
written synchronously, flushed asynchronously) rather than a bare fire-and-forget
promise.

## Derived "Expired" status vs. a background job

**Chosen:** No cron/worker flips a link's status when `expiresAt` passes; every read
path computes `EXPIRED` on the fly by comparing `expiresAt` to `Date.now()`.

**Alternative considered:** A scheduled job that flips `status` to a literal
`EXPIRED` enum value in the database once expiry passes.

**Why not:** A background job introduces a window where the stored status is wrong
(e.g. up to a poll interval late) and adds an operational component (a scheduler)
for a value that's trivially computable from data already on the row. The derived
approach is always correct with zero moving parts; the cost is that every list/detail
query has to run the comparison in application code (or SQL) rather than filtering
on an indexed enum column directly — acceptable at this scale, and the `expiresAt`
column is indexed for range filtering regardless.

## Local GeoIP (`geoip-lite`) vs. a live IP-geolocation API

**Chosen:** `geoip-lite`, a local MaxMind-lite database bundled with the backend —
no network call on the request path.

**Why:** The spec allows "any free API or mock implementation" for country lookup.
A live third-party call sits directly on the redirect hot path and would be the
single biggest latency and reliability risk against the 100ms constraint (network
calls to third parties routinely take longer than 100ms on their own, before
accounting for the rest of the request). `geoip-lite`'s lookup is an in-memory trie
read, effectively free.

**Cost:** Its bundled database is a point-in-time snapshot (accuracy trails a live
API, especially for corporate/mobile IP ranges) and it isn't as precise as a paid
geolocation service. Acceptable for internal marketing analytics; not a claim of
billing- or compliance-grade accuracy.

## Polling vs. WebSocket/SSE for "no page refresh"

**Chosen:** React Query with a 15s `refetchInterval` on dashboard stats, plus
standard client-side routing (React Router) so navigation never triggers a full page
reload.

**Why not push-based:** The spec's real-time requirement here is much looser than
the notification-system assignment (no explicit latency budget on dashboard
freshness) — "the dashboard should work without page refreshes" is a navigation/UX
requirement, not a live-update requirement. Introducing a WebSocket/SSE channel for
this would be meaningfully more infrastructure (connection management, reconnect
logic, fan-out) for a requirement that polling already satisfies.

## Known limitations

- Click analytics aggregation (`groupBy` + raw SQL) runs directly against the OLTP
  table on every request; fine at the click volumes implied by "internal marketing
  campaigns," but would need a rollup table or a read replica at high volume.
- No authentication/authorization layer — the assignment describes an internal tool
  and doesn't list auth as a requirement (unlike Assignments 4 and 8), so none was
  added. Every `/api/*` route is open; a real deployment would put this behind SSO or
  the org's existing auth gateway.
- Redis being unavailable degrades the redirect path to a Postgres read per request
  (still correct, just slower) rather than failing closed — a deliberate choice, but
  it means a Redis outage is currently silent (only visible in logs), not alerted.
- `Click` rows for a soft-deleted link are retained indefinitely (soft delete only
  hides the parent `Link`; there's no TTL/archival job for its click history). Fine
  at this data volume, but a long-lived deployment would want a retention policy.
- `req.ip`/IP-based analytics (country, `ipHash`) trust exactly one reverse-proxy hop
  (`app.set("trust proxy", 1)`, matching the nginx/compose topology shipped here). A
  deployment with a different number of hops in front of the API needs to adjust that
  value, or country/IP-hash data becomes attributable to the proxy instead of the
  visitor.

## Improvements with more time

- Pre-warm the Redis cache for a link immediately after creation (currently it's
  populated lazily on first redirect).
- Add a lightweight admin auth (single shared token or JWT) since even an internal
  tool with a public write API is a soft target.
- Add p99 latency instrumentation (e.g. a histogram metric on the redirect handler)
  instead of relying on manual `curl -w` timing checks to validate the 100ms
  constraint.
- Add a retention/archival job for `Click` rows belonging to soft-deleted links.

## Addressed during the follow-up production-readiness audit

- **Bundle size:** the analytics page (and the Recharts dependency it pulls in) is
  now lazy-loaded (`React.lazy` + `Suspense` in `App.tsx`) instead of shipping in the
  main bundle — the initial dashboard chunk dropped from ~792KB to ~377KB raw
  (~118KB gzipped), with the analytics chunk (~416KB raw) fetched only when a user
  actually opens a link's analytics page.
- **IP spoofing in analytics:** `X-Forwarded-For` was previously read directly from
  request headers, which a client can set to arbitrary values. Fixed by trusting
  Express's own `req.ip` resolution with `trust proxy` explicitly scoped to one hop,
  rather than parsing the header by hand.
- **Click-write atomicity:** the `Click` insert and the `Link.clickCount` increment
  were two independent writes (`Promise.all`) that could partially fail and drift
  from each other. Wrapped in a single `prisma.$transaction` — still fire-and-forget
  relative to the redirect response, but now atomic relative to each other.
- **Process-level error handling:** added `unhandledRejection`/`uncaughtException`
  handlers in `server.ts` so an error outside the request/response cycle is logged
  (and, for uncaught exceptions, causes a controlled exit) instead of failing silently.
- **Modal accessibility:** `LinkFormModal` and `ConfirmDialog` previously had no
  Escape-to-close, no initial focus placement, and no focus trap — keyboard and
  screen-reader users could tab out behind the overlay. Added a shared
  `useModalA11y` hook handling all three.
- **Redundant DB index:** `Link.shortCode` had both an explicit `@@index` and an
  implicit unique index from `@unique` — the same column indexed twice, adding
  write overhead for no read benefit. Removed the redundant explicit index and
  added two composite indexes (`[deletedAt, status]`, `[deletedAt, expiresAt]`)
  that actually match the status-filter and expiry-filter query shapes used by
  `listLinks`/`getDashboardStats`.
