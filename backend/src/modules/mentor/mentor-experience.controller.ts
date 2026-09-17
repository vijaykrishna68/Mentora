import type { RequestHandler } from "express";
import * as experienceService from "./mentor-experience.service.js";
import type { CreateExperienceInput, UpdateExperienceInput } from "./mentor-experience.schema.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateExperienceInput;
    const entry = await experienceService.createExperience(req.user!.userId, input);
    res.status(201).json({ data: { experienceEntry: entry } });
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as UpdateExperienceInput;
    const entry = await experienceService.updateExperience(req.user!.userId, req.params.id as string, input);
    res.status(200).json({ data: { experienceEntry: entry } });
  } catch (error) {
    next(error);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await experienceService.deleteExperience(req.user!.userId, req.params.id as string);
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
};
