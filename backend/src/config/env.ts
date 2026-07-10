import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  baseUrl: required("BASE_URL", "http://localhost:4000"),
  frontendOrigin: required("FRONTEND_ORIGIN", "http://localhost:5173"),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  shortCodeLength: Number(process.env.SHORT_CODE_LENGTH ?? 7),
  isTest: process.env.NODE_ENV === "test",
};
