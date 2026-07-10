# Setup

## Option A — Docker Compose (recommended, matches the grading environment)

Requires Docker + Docker Compose.

```bash
docker compose up --build
```

This starts four services: `postgres` (5432), `redis` (6379), `backend` (4000),
`frontend` (5173). The backend container runs `prisma migrate deploy` automatically
on startup before the API starts listening — no manual migration step needed.

- Dashboard: http://localhost:5173
- API: http://localhost:4000
- Health check: http://localhost:4000/health

To seed demo data (6 sample links with realistic click history) after the stack is
up:

```bash
docker compose exec backend npm run prisma:seed
```

To stop: `docker compose down` (add `-v` to also drop the Postgres volume).

## Option B — Local development (without Docker)

Requires Node.js 18+, a local PostgreSQL instance, and a local Redis instance.

### Backend

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL / REDIS_URL if not using the defaults
npm install
npm run prisma:migrate:dev   # applies migrations, creates the database schema
npm run prisma:seed          # optional demo data
npm run dev                  # starts the API on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_BASE_URL defaults to http://localhost:4000
npm install
npm run dev                  # starts the dashboard on http://localhost:5173
```

## Running tests

```bash
# Backend — unit + integration (needs a real Postgres + Redis; see backend/tests/setup.ts
# for the default connection strings, or override DATABASE_URL / REDIS_URL env vars)
cd backend && npm test
cd backend && npm run test:coverage   # coverage report (target: 80%+)

# Frontend — component tests (Vitest + Testing Library)
cd frontend && npm test
```

## Quality gate (both packages)

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
