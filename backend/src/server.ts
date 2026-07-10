import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`URL Shortener API listening on port ${env.port} [${env.nodeEnv}]`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Safety net for errors outside the request/response cycle (e.g. a rejected
// fire-and-forget promise, a client-level error from Prisma/Redis). Every route
// handler already funnels errors through errorHandler — this only catches what
// would otherwise crash the process silently or leave it in an unknown state.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});
