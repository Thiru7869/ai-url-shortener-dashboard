import { Request, Response, NextFunction } from "express";
import { resolveShortCode, recordClickAsync } from "../services/redirect.service";
import { extractRequestMeta } from "../utils/requestMeta";
import { AppError } from "../utils/AppError";

export async function redirect(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { shortCode } = req.params;
    const result = await resolveShortCode(shortCode);

    switch (result.outcome) {
      case "not_found":
        next(AppError.notFound("Short link not found"));
        return;
      case "disabled":
        next(AppError.gone("This link has been disabled"));
        return;
      case "expired":
        next(AppError.gone("This link has expired"));
        return;
      case "redirect": {
        res.redirect(302, result.originalUrl);
        const meta = extractRequestMeta(req);
        recordClickAsync(result.linkId, meta);
        return;
      }
    }
  } catch (err) {
    next(err);
  }
}
