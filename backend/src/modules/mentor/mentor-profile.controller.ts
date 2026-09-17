import type { RequestHandler } from "express";
import * as profileService from "./mentor-profile.service.js";
import type { UpdateMentorProfileInput } from "./mentor-profile.schema.js";

export const getProfile: RequestHandler = async (req, res, next) => {
  try {
    const result = await profileService.getMyProfile(req.user!.userId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as UpdateMentorProfileInput;
    const result = await profileService.updateMyProfile(req.user!.userId, input);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
