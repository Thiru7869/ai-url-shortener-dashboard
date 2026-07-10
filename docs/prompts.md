# AI Usage Log

## Tool

Claude Code (Claude Sonnet 5), used as the sole author of this codebase end to end —
planning, implementation, testing, and verification — under a single directive from
the user to build this assignment autonomously to a production-ready state.

## How the prompt evolved

1. The user first asked for the assignment PDF to be read and every assignment
   identified, then asked exactly one clarifying question ("Which Assignment Number
   should I build?").
2. After the user picked Assignment 7, the instruction was to build a full internal
   checklist and architecture plan and present it for review *before* writing code
   (Claude Code's plan mode was used for this — the plan was written to a plan file,
   covering the requirement checklist, architecture decisions, DB schema, API design,
   folder structure, and roadmap, then presented via `ExitPlanMode` for approval).
3. Once approved, implementation proceeded autonomously through 14 tracked tasks
   (scaffold → backend → tests → frontend → Docker → docs → self-review) without
   further prompts from the user — matching the "don't stop, don't ask unnecessary
   questions" instruction in the governing prompt.
4. In a follow-up session, the user asked for a dedicated production-readiness audit:
   re-verify every requirement, then specifically search for dead code, unused
   dependencies, and gaps in security/error-handling/performance/accessibility, fix
   whatever was found, re-run every verification gate, and write up the findings.
   That pass is documented below and in full in `AUDIT_REPORT.md`.

## The follow-up audit — self-review of the original build

Rather than re-asserting the first pass was already correct, this session used
independent Explore-agent audits (given only the file paths and a skeptical brief,
not my own summary of what I'd built) to find real issues in code I had already
written and called "done." That surfaced several genuine mistakes from the original
implementation:

- A redundant database index (`shortCode` was indexed twice — once explicitly, once
  implicitly via its `@unique` constraint).
- An IP-spoofing gap in analytics (`X-Forwarded-For` was parsed by hand instead of
  going through Express's `trust proxy` mechanism).
- A non-atomic pair of writes in the click-logging path (`Promise.all` instead of a
  transaction, so the click log and the denormalized counter could drift on a
  partial failure).
- Missing modal accessibility (no Escape-to-close, no focus trap, no initial focus)
  on both dialogs in the app.
- An unused dependency (`clsx`) left in `package.json` from initial scaffolding.
- The largest, most avoidable one: an unaddressed ~792KB single-chunk frontend
  bundle, despite the Vite build output *warning about this on every single build*
  throughout the original session. I had documented it as a "known limitation"
  in `docs/tradeoffs.md` instead of just fixing it — lazy-loading the analytics
  route was a five-minute change, not a real limitation.

Each is detailed with file:line and the fix applied in `AUDIT_REPORT.md`. All are
fixed in this pass, re-tested (57 backend / 15 frontend tests, all green), and
re-verified through a second full `docker compose up --build` run.

## Where AI suggestions were accepted vs. adjusted

- **Accepted as-is:** the layered backend architecture (routes/controllers/services),
  Zod-at-the-edge validation, cache-aside Redis for the redirect path, and the
  React Query + Tailwind frontend stack — these were the model's first-pass design
  and held up through implementation and testing without rework.
- **Adjusted mid-build:** the initial `Link.status` design conflated "disabled" and
  "expired" into a single field. This was reworked into a stored `status` enum plus
  a derived `deriveStatus()` function (see `docs/architecture.md`) once it became
  clear the dashboard's four stat tiles (Active/Expired as separate, non-overlapping
  counts) couldn't be served correctly from one raw column.
- **Adjusted mid-build:** the analytics `groupBy` queries were first written with a
  Prisma `orderBy: { _count: { <field>: 'desc' } }` clause. On review this was
  recognized as unreliable — Prisma orders by the count of *non-null* occurrences of
  the grouped field, which silently diverges from `_count._all` whenever a dimension
  (e.g. `referrer`) is `null` for direct traffic. It was replaced with an unordered
  Prisma query followed by an explicit JS `.sort()` before truncating to the top-N,
  removing the ambiguity entirely.

## AI mistakes caught and fixed (with evidence)

### 1. Timezone bug in the daily-clicks chart (caught by a failing integration test)

The first implementation of `getLinkAnalytics` built the "last N days" window using
`Date.prototype.setHours(0, 0, 0, 0)` (local time) in Node, then joined those keys
against Postgres's `date_trunc('day', "timestamp")` (UTC by default in the
container). On the machine this was built on (a non-UTC timezone), every click fell
on the wrong side of a day boundary, and `analytics.api.test.ts` failed with
`dailyClicks` summing to `0` instead of the expected `4`. Root cause was diagnosed
by comparing the raw SQL day buckets against the JS-generated day keys; the fix was
to force both sides onto UTC (`setUTCDate`/`setUTCHours` in JS, `AT TIME ZONE 'UTC'`
in the SQL) — see the fix in `backend/src/services/analytics.service.ts`. This is
exactly the kind of bug integration tests against a real database exist to catch;
it would not have been caught by a unit test with a mocked Prisma client.

### 2. Docker build produced `Cannot find module '/app/dist/server.js'`

The backend's `tsconfig.json` sets `rootDir: "."` (needed so `tsc --noEmit` could
typecheck `tests/` and `prisma/seed.ts` alongside `src/`), but the production build
script reused that same config, which made TypeScript nest its output under
`dist/src/server.js` instead of `dist/server.js`. This passed local `npm run build`
and `npm start` without complaint (the mismatch is invisible until something greps
for the literal build output path), and was only caught when the full
`docker compose up` stack was run for real verification — the backend container
crash-looped on startup with `MODULE_NOT_FOUND`. Fixed by adding a dedicated
`tsconfig.build.json` (`rootDir: "src"`, `src/**/*.ts` only) used solely by the
`build` script, decoupling "what gets typechecked" from "what gets compiled for
production." This is called out specifically because it's a bug that would have
shipped invisibly if Docker hadn't actually been run end-to-end rather than just
`docker build`-ed.

### 3. A false-positive "broken charts" signal from the verification tooling itself

While visually verifying the Analytics page, an early headless-Chrome screenshot
(`msedge --headless=new --virtual-time-budget=...`) showed the daily-clicks area
chart and both pie charts rendering completely empty (axes and legends present, no
data shapes), while the hand-built bar-list charts on the same page rendered
correctly. This looked like a real bug in the Recharts integration. Before reporting
it as one, the same page was re-captured with Puppeteer driving a real (non
virtual-time) browser session with a `networkidle0` wait — the charts rendered
correctly. The `--virtual-time-budget` flag fast-forwards Chrome's clock instead of
running real animation frames, which starves Recharts' `ResponsiveContainer` (it
sizes itself via `ResizeObserver`, which needs a real frame to fire). Concluding
this was a screenshot-tooling artifact rather than an app bug — and confirming that
conclusion with an independent tool before writing it off — avoided either shipping
a false "known issue" in the docs or, worse, "fixing" working code in response to a
tooling artifact.
