import type { RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/tokens.js";
import { ACCESS_TOKEN_COOKIE } from "../lib/cookies.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (!token || typeof token !== "string") {
    next(new AppError(401, "UNAUTHENTICATED", "Authentication required."));
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError(401, "UNAUTHENTICATED", "Invalid or expired authentication."));
  }
};

// Role authorization only — does NOT imply ownership of a specific resource.
// Ownership checks belong in the modules that own those resources.
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication required."));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action."));
      return;
    }
    next();
  };
}
