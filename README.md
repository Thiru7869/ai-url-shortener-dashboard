# LinkPilot — AI-Powered URL Shortener Dashboard

A production-ready URL shortening platform for internal marketing campaigns:
create short links with optional custom aliases and expiry dates, track clicks in
real time, and drill into per-link analytics (daily trend, browser/device/country
distribution, top referrers). Built for **Assignment 7** of the AI-Native Developer
Hiring track.

## Stack

- **Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, Redis, Zod
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Query, React Hook Form, Recharts
- **Infra:** Docker, Docker Compose
- **Tests:** Jest + Supertest (backend, 57 tests), Vitest + Testing Library (frontend, 15 tests)

## Quick start

```bash
docker compose up --build
```

Then open http://localhost:5173. See [SETUP.md](./SETUP.md) for local (non-Docker)
development and [API.md](./API.md) for the full endpoint reference.

## Highlights

- **Sub-100ms redirects** via Redis cache-aside, with click tracking recorded
  asynchronously so it never adds latency to the redirect response (measured:
  ~5ms warm cache, ~40ms cold cache, locally).
- **Real analytics**, not mocked counters — every chart is aggregated live from a
  `Click` fact table (browser/OS parsed from the User-Agent, country from a local
  GeoIP lookup, referrer from the `Referer` header).
- **Graceful alias conflicts** — a taken custom alias returns a clear `409` instead
  of silently renaming or failing opaquely.
- **Soft delete everywhere** — nothing is destructively removed via the API.
- **Accessible by default** — modals trap focus, support Escape-to-close, and every
  status/filter control exposes its state via `aria-pressed`/`aria-label`, not color
  alone.
- **Code-split analytics bundle** — the Recharts-heavy analytics page loads as its
  own chunk on demand, so the initial dashboard load ships ~377KB (118KB gzip)
  instead of the full ~792KB bundle.
- Fully typed end to end (TypeScript + Zod on the backend, TypeScript + Zod on the
  frontend forms), with 90%+ backend statement coverage.

## Documentation

| Doc | Contents |
|---|---|
| [docs/approach.md](./docs/approach.md) | Problem understanding, plan, assumptions |
| [docs/architecture.md](./docs/architecture.md) | Components, data flow, DB schema, Mermaid diagrams |
| [docs/tradeoffs.md](./docs/tradeoffs.md) | Design decisions, alternatives considered, known limitations |
| [docs/prompts.md](./docs/prompts.md) | AI usage log, including real mistakes caught and fixed |
| [API.md](./API.md) | Full REST API reference |
| [SETUP.md](./SETUP.md) | Local dev, Docker, and test instructions |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Container images, env vars, production notes |
| [PROJECT_REPORT.md](./PROJECT_REPORT.md) | Requirement compliance table, final summary |
| [AUDIT_REPORT.md](./AUDIT_REPORT.md) | Follow-up production-readiness audit: findings, fixes, readiness score |

## Project structure

```
backend/    Express + TypeScript API (routes/controllers/services/Prisma)
frontend/   React + TypeScript dashboard (Vite + Tailwind + React Query)
docs/       approach / architecture / tradeoffs / prompts
postman/    Postman collection covering every endpoint
```
