import type { RequestHandler } from "express";
import * as availabilityService from "./mentor-availability.service.js";
import type {
  CreateAvailabilityRuleInput,
  UpdateAvailabilityRuleInput,
} from "./mentor-availability.schema.js";

export const list: RequestHandler = async (req, res, next) => {
  try {
    const rules = await availabilityService.listAvailabilityRules(req.user!.userId);
    res.status(200).json({ data: { rules } });
  } catch (error) {
    next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateAvailabilityRuleInput;
    const result = await availabilityService.createAvailabilityRule(req.user!.userId, input);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as UpdateAvailabilityRuleInput;
    const result = await availabilityService.updateAvailabilityRule(req.user!.userId, req.params.id as string, input);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    const result = await availabilityService.deleteAvailabilityRule(req.user!.userId, req.params.id as string);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
