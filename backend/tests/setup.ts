process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/url_shortener_test?schema=public";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6380/1";
process.env.BASE_URL = process.env.BASE_URL ?? "http://localhost:4000";
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
process.env.SHORT_CODE_LENGTH = process.env.SHORT_CODE_LENGTH ?? "7";
