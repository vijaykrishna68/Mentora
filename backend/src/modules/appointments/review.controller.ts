import type { RequestHandler } from "express";
import * as reviewService from "./review.service.js";
import type { CreateReviewInput } from "./review.schema.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateReviewInput;
    const review = await reviewService.createReview(req.user!.userId, req.params.id as string, input);
    res.status(201).json({ data: { review } });
  } catch (error) {
    next(error);
  }
};
