import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // ~15 minutes
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // ~7 days

const isProd = env.NODE_ENV === "production";

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // Relaxed `secure` over localhost HTTP in dev/test; real cross-site
    // cookies in production require secure + SameSite=None (03c §67).
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });
  // Scoped to /api/auth only — the refresh token never needs to leave the
  // browser on ordinary API calls, which limits its exposure.
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseCookieOptions(), path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseCookieOptions(), path: "/api/auth" });
}
