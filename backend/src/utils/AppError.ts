export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, details);
  }

  static notFound(message: string): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, 409, details);
  }

  static gone(message: string): AppError {
    return new AppError(message, 410);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(message, 500);
  }
}
