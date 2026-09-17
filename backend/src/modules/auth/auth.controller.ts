import type { RequestHandler } from "express";
import * as authService from "./auth.service.js";
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from "../../lib/cookies.js";
import { AppError } from "../../lib/errors.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";

export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as RegisterInput;
    const result =
      input.role === "CUSTOMER"
        ? await authService.registerCustomer(input)
        : await authService.registerMentor(input);
    setAuthCookies(res, result);
    res.status(201).json({ data: { user: result.user } });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as LoginInput;
    const result = await authService.login(input);
    setAuthCookies(res, result);
    res.status(200).json({ data: { user: result.user } });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const rawRefreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
    await authService.logout(typeof rawRefreshToken === "string" ? rawRefreshToken : undefined);
    clearAuthCookies(res);
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const rawRefreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      throw new AppError(401, "MISSING_REFRESH_TOKEN", "No refresh token provided.");
    }
    const result = await authService.refresh(rawRefreshToken);
    setAuthCookies(res, result);
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.status(200).json({ data: { user } });
  } catch (error) {
    next(error);
  }
};
