import { Router } from "express";
import * as linkController from "../controllers/link.controller";
import * as analyticsController from "../controllers/analytics.controller";
import { validate } from "../middleware/validate";
import {
  createLinkSchema,
  idParamSchema,
  listLinksQuerySchema,
  updateLinkSchema,
  updateStatusSchema,
  analyticsQuerySchema,
} from "../validators/link.validators";

const router = Router();

router.post("/", validate({ body: createLinkSchema }), linkController.create);
router.get("/", validate({ query: listLinksQuerySchema }), linkController.list);
router.get("/:id", validate({ params: idParamSchema }), linkController.getById);
router.put("/:id", validate({ params: idParamSchema, body: updateLinkSchema }), linkController.update);
router.patch(
  "/:id/status",
  validate({ params: idParamSchema, body: updateStatusSchema }),
  linkController.updateStatus,
);
router.delete("/:id", validate({ params: idParamSchema }), linkController.remove);
router.get(
  "/:id/analytics",
  validate({ params: idParamSchema, query: analyticsQuerySchema }),
  analyticsController.getAnalytics,
);

export default router;
