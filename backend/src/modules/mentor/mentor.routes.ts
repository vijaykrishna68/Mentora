import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateParams } from "../../middleware/validation.js";
import { updateMentorProfileSchema } from "./mentor-profile.schema.js";
import { createExperienceSchema, updateExperienceSchema } from "./mentor-experience.schema.js";
import { createOfferingSchema, updateOfferingSchema } from "./mentor-offering.schema.js";
import { createAvailabilityRuleSchema, updateAvailabilityRuleSchema } from "./mentor-availability.schema.js";
import * as profileController from "./mentor-profile.controller.js";
import * as experienceController from "./mentor-experience.controller.js";
import * as offeringController from "./mentor-offering.controller.js";
import * as availabilityController from "./mentor-availability.controller.js";
import * as appointmentsController from "./mentor-appointments.controller.js";

const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const router = Router();

// Every mentor-management route requires an authenticated MENTOR. Ownership
// of the specific resource being touched is still checked per-service.
router.use(requireAuth, requireRole(Role.MENTOR));

router.get("/profile", profileController.getProfile);
router.patch("/profile", validateBody(updateMentorProfileSchema), profileController.updateProfile);

router.post("/experience", validateBody(createExperienceSchema), experienceController.create);
router.patch(
  "/experience/:id",
  validateParams(idParamSchema),
  validateBody(updateExperienceSchema),
  experienceController.update,
);
router.delete("/experience/:id", validateParams(idParamSchema), experienceController.remove);

router.get("/offerings", offeringController.list);
router.post("/offerings", validateBody(createOfferingSchema), offeringController.create);
router.patch(
  "/offerings/:id",
  validateParams(idParamSchema),
  validateBody(updateOfferingSchema),
  offeringController.update,
);
router.delete("/offerings/:id", validateParams(idParamSchema), offeringController.remove);

router.get("/availability", availabilityController.list);
router.post("/availability", validateBody(createAvailabilityRuleSchema), availabilityController.create);
router.patch(
  "/availability/:id",
  validateParams(idParamSchema),
  validateBody(updateAvailabilityRuleSchema),
  availabilityController.update,
);
router.delete("/availability/:id", validateParams(idParamSchema), availabilityController.remove);

router.get("/appointments", appointmentsController.list);

export default router;
