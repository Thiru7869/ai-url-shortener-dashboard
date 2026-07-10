import { Router } from "express";
import * as redirectController from "../controllers/redirect.controller";
import { validate } from "../middleware/validate";
import { shortCodeParamSchema } from "../validators/link.validators";
import { redirectRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/:shortCode", redirectRateLimiter, validate({ params: shortCodeParamSchema }), redirectController.redirect);

export default router;
