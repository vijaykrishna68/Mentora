import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateParams } from "../../middleware/validation.js";
import { createAppointmentSchema } from "./appointment.schema.js";
import { createReviewSchema } from "./review.schema.js";
import * as appointmentController from "./appointment.controller.js";
import * as reviewController from "./review.controller.js";

const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const router = Router();

router.get("/", requireAuth, requireRole(Role.CUSTOMER), appointmentController.list);

router.post(
  "/",
  requireAuth,
  requireRole(Role.CUSTOMER),
  validateBody(createAppointmentSchema),
  appointmentController.create,
);

router.patch(
  "/:id/cancel",
  requireAuth,
  requireRole(Role.CUSTOMER),
  validateParams(idParamSchema),
  appointmentController.cancel,
);

router.post(
  "/:id/review",
  requireAuth,
  requireRole(Role.CUSTOMER),
  validateParams(idParamSchema),
  validateBody(createReviewSchema),
  reviewController.create,
);

export default router;
