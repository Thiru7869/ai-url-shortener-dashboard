import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";

interface ErrorResponseBody {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  const body: ErrorResponseBody = {
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const body: ErrorResponseBody = {
      success: false,
      error: { message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorResponseBody = {
      success: false,
      error: { message: "Validation failed", details: err.flatten() },
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const body: ErrorResponseBody = {
        success: false,
        error: { message: "A resource with this unique value already exists", details: err.meta },
      };
      res.status(409).json(body);
      return;
    }
    if (err.code === "P2025") {
      const body: ErrorResponseBody = {
        success: false,
        error: { message: "Resource not found" },
      };
      res.status(404).json(body);
      return;
    }
  }

  logger.error({ err }, "Unhandled error");
  const body: ErrorResponseBody = {
    success: false,
    error: { message: "Internal server error" },
  };
  res.status(500).json(body);
}
