import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/errors.js";

// Structural validation only (shape/type/format) — business rules belong in
// services, not here (03c §23).
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      next(new AppError(400, "VALIDATION_ERROR", message));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", "Invalid route parameters."));
      return;
    }
    req.params = result.data as typeof req.params;
    next();
  };
}

// Express 5's req.query has no setter, so validated data goes on
// req.validatedQuery instead (see src/types/express.d.ts).
export function validateQuery(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || "query"}: ${issue.message}`)
        .join("; ");
      next(new AppError(400, "VALIDATION_ERROR", message));
      return;
    }
    req.validatedQuery = result.data as Record<string, unknown>;
    next();
  };
}
