import type { RequestHandler } from "express";
import { discoverMentors } from "./discover.service.js";
import type { DiscoverQuery } from "./discover.schema.js";

export const list: RequestHandler = async (req, res, next) => {
  try {
    const query = req.validatedQuery as unknown as DiscoverQuery;
    const result = await discoverMentors(query);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
