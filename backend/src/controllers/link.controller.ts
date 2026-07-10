import { Request, Response, NextFunction } from "express";
import * as linkService from "../services/link.service";
import { sendSuccess } from "../utils/response";
import { CreateLinkInput, ListLinksQuery, UpdateLinkInput, UpdateStatusInput } from "../validators/link.validators";

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CreateLinkInput;
    const link = await linkService.createLink(input);
    sendSuccess(res, link, 201);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as ListLinksQuery;
    const { items, pagination } = await linkService.listLinks(query);
    sendSuccess(res, items, 200, { pagination });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const link = await linkService.getLinkById(req.params.id);
    sendSuccess(res, link);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as UpdateLinkInput;
    const link = await linkService.updateLink(req.params.id, input);
    sendSuccess(res, link);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body as UpdateStatusInput;
    const link = await linkService.updateLinkStatus(req.params.id, status);
    sendSuccess(res, link);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await linkService.softDeleteLink(req.params.id);
    sendSuccess(res, { id: req.params.id, deleted: true });
  } catch (err) {
    next(err);
  }
}
