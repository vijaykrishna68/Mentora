import type { RequestHandler } from "express";
import * as offeringService from "./mentor-offering.service.js";
import type { CreateOfferingInput, UpdateOfferingInput } from "./mentor-offering.schema.js";

export const list: RequestHandler = async (req, res, next) => {
  try {
    const offerings = await offeringService.listOfferings(req.user!.userId);
    res.status(200).json({ data: { offerings } });
  } catch (error) {
    next(error);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateOfferingInput;
    const result = await offeringService.createOffering(req.user!.userId, input);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as UpdateOfferingInput;
    const result = await offeringService.updateOffering(req.user!.userId, req.params.id as string, input);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    const result = await offeringService.deleteOffering(req.user!.userId, req.params.id as string);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
