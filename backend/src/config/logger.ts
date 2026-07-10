import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.isTest ? "silent" : env.nodeEnv === "development" ? "debug" : "info",
  transport:
    env.nodeEnv === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
});
