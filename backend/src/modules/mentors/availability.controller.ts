import type { RequestHandler } from "express";
import * as availabilityService from "./availability.service.js";
import type { GetAvailabilityQuery } from "./availability.schema.js";

export const getAvailability: RequestHandler = async (req, res, next) => {
  try {
    const { offeringId, date } = req.validatedQuery as unknown as GetAvailabilityQuery;
    const mentorId = req.params.mentorId as string;
    const result = await availabilityService.getPublicAvailability({ mentorId, offeringId, date });
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
