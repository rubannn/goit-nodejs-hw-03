import { Router } from "express";

import * as announcementsController from "../controllers/announcements.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { upload } from "../middleware/upload.ts";
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

router.post(
  "/",
  authenticate,
  upload.single("photo"),
  validateBody(createAnnouncementSchema),
  announcementsController.create,
);

router.patch(
  "/:id",
  authenticate,
  upload.single("photo"),
  validateParams(announcementIdParamSchema),
  validateBody(updateAnnouncementSchema),
  announcementsController.update,
);

router.delete("/:id", authenticate, validateParams(announcementIdParamSchema), announcementsController.remove);

export default router;
