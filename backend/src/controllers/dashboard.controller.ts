import { Request, Response, NextFunction } from "express";
import { getDashboardStats } from "../services/link.service";
import { sendSuccess } from "../utils/response";

export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getDashboardStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}
