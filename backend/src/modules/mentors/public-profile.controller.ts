import type { RequestHandler } from "express";
import { getPublicMentorProfile } from "./public-profile.service.js";

export const getProfile: RequestHandler = async (req, res, next) => {
  try {
    const mentor = await getPublicMentorProfile(req.params.mentorId as string);
    res.status(200).json({ data: { mentor } });
  } catch (error) {
    next(error);
  }
};
