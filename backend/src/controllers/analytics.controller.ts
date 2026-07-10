import { Request, Response, NextFunction } from "express";
import { getLinkAnalytics } from "../services/analytics.service";
import { sendSuccess } from "../utils/response";
import { AnalyticsQuery } from "../validators/link.validators";

export async function getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { days } = req.query as unknown as AnalyticsQuery;
    const analytics = await getLinkAnalytics(req.params.id, days);
    sendSuccess(res, analytics);
  } catch (err) {
    next(err);
  }
}
