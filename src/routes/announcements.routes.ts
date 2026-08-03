import { Router } from "express";

import * as announcementsController from "../controllers/announcements.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.ts";
import {
  announcementIdParamSchema,
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.ts";

const router = Router();

router.get("/", validateQuery(listAnnouncementsQuerySchema), announcementsController.list);
router.get("/:id", validateParams(announcementIdParamSchema), announcementsController.getById);

router.post("/", authenticate, validateBody(createAnnouncementSchema), announcementsController.create);

router.patch(
  "/:id",
  authenticate,
  validateParams(announcementIdParamSchema),
  validateBody(updateAnnouncementSchema),
  announcementsController.update,
);

router.delete("/:id", authenticate, validateParams(announcementIdParamSchema), announcementsController.remove);

export default router;
