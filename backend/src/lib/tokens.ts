import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";

// JWT payload stays minimal by design (userId + role only) — see
// 03c-backend-technical-spec.md §17. Never add email/profile/permissions here.
export interface AccessTokenPayload {
  userId: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || !decoded.userId || !decoded.role) {
    throw new Error("Malformed access token payload");
  }
  return { userId: decoded.userId as string, role: decoded.role as Role };
}

// The refresh token is an opaque, high-entropy random value — not a JWT.
// Its state (validity/revocation) lives entirely in the RefreshToken table,
// so there is nothing useful to decode from the token itself.
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
