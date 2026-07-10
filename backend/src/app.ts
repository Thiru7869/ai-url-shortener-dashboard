import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import linkRoutes from "./routes/link.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import redirectRoutes from "./routes/redirect.routes";

export function createApp(): Application {
  const app = express();

  app.disable("x-powered-by");
  // Trust exactly one hop (the reverse proxy / load balancer in front of this
  // service) so req.ip resolves from X-Forwarded-For safely instead of trusting
  // an arbitrary, client-spoofable header chain.
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger, autoLogging: !env.isTest }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/links", apiRateLimiter, linkRoutes);
  app.use("/api/dashboard", apiRateLimiter, dashboardRoutes);

  // Root-level redirect endpoint, kept separate from /api so short URLs stay clean.
  app.use("/", redirectRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
