import { Router } from "express";
import { validateParams, validateQuery } from "../../middleware/validation.js";
import { mentorIdParamSchema, getAvailabilityQuerySchema } from "./availability.schema.js";
import { getAvailability } from "./availability.controller.js";
import { discoverQuerySchema } from "./discover.schema.js";
import { list as discoverMentorsHandler } from "./discover.controller.js";
import { getProfile } from "./public-profile.controller.js";

const router = Router();

// Public — no requireAuth anywhere in this router. Mentor self-management
// stays under the separate, protected /api/mentor router.
router.get("/", validateQuery(discoverQuerySchema), discoverMentorsHandler);

router.get("/:mentorId", validateParams(mentorIdParamSchema), getProfile);

// Existing since Phase 4 — unchanged, still the only slot-generation entry point.
router.get(
  "/:mentorId/availability",
  validateParams(mentorIdParamSchema),
  validateQuery(getAvailabilityQuerySchema),
  getAvailability,
);

export default router;
