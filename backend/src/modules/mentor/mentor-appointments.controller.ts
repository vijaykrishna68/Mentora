import type { RequestHandler } from "express";
import * as mentorAppointmentsService from "./mentor-appointments.service.js";

export const list: RequestHandler = async (req, res, next) => {
  try {
    const result = await mentorAppointmentsService.listMentorAppointments(req.user!.userId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
