import type { RequestHandler } from "express";
import * as appointmentService from "./appointment.service.js";
import type { CreateAppointmentInput } from "./appointment.schema.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateAppointmentInput;
    const appointment = await appointmentService.createAppointment(req.user!.userId, input);
    res.status(201).json({ data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const appointment = await appointmentService.cancelAppointment(req.user!.userId, req.params.id as string);
    res.status(200).json({ data: { appointment } });
  } catch (error) {
    next(error);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    const result = await appointmentService.listMyAppointments(req.user!.userId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
