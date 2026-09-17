import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { requireRole } from "../src/middleware/auth.js";
import type { Role } from "@prisma/client";
import { uniqueEmail, registerCustomer, registerMentor, getCookie } from "./helpers.js";

describe("POST /api/auth/register", () => {
  it("registers a customer successfully", async () => {
    const { res } = await registerCustomer();
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ role: "CUSTOMER", interests: ["CAREER_GROWTH"] });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(getCookie(res, "accessToken")).toBeTruthy();
    expect(getCookie(res, "refreshToken")).toBeTruthy();
  });

  it("registers a mentor successfully and creates an incomplete MentorProfile", async () => {
    const { res, email } = await registerMentor();
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ role: "MENTOR" });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: { mentorProfile: true },
    });
    expect(user.mentorProfile).not.toBeNull();
    expect(user.mentorProfile?.onboardingComplete).toBe(false);
    expect(user.mentorProfile?.acceptingBookings).toBe(false);
    expect(user.mentorProfile?.timezone).toBeNull();
  });

  it("rejects a duplicate email registration with 409", async () => {
    const { email } = await registerCustomer();
    const { res } = await registerCustomer({ email });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("hashes the password and never returns it", async () => {
    const { email } = await registerCustomer();
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).not.toBe("correct-horse-battery-staple");
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);

    const { res } = await registerCustomer();
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("rejects malformed registration input with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ role: "CUSTOMER", email: "not-an-email", password: "short", name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/login", () => {
  it("succeeds with valid credentials", async () => {
    const { email } = await registerCustomer();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "correct-horse-battery-staple" });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(getCookie(res, "accessToken")).toBeTruthy();
  });

  it("returns the same generic error for unknown email and wrong password (no enumeration)", async () => {
    const { email } = await registerCustomer();

    const wrongPassword = await request(app).post("/api/auth/login").send({ email, password: "wrong-password-here" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: uniqueEmail("nobody"), password: "wrong-password-here" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe("GET /api/auth/me", () => {
  it("rejects requests with no access token cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects requests with a malformed/invalid access token cookie", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "accessToken=not-a-real-jwt");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the authenticated user without passwordHash", async () => {
    const { res: registerRes, email } = await registerCustomer();
    const accessToken = getCookie(registerRes, "accessToken");

    const res = await request(app).get("/api/auth/me").set("Cookie", `accessToken=${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });
});

describe("POST /api/auth/refresh", () => {
  it("issues new tokens given a valid refresh token", async () => {
    const { res: registerRes } = await registerCustomer();
    const refreshToken = getCookie(registerRes, "refreshToken");

    const res = await request(app).post("/api/auth/refresh").set("Cookie", `refreshToken=${refreshToken}`);
    expect(res.status).toBe(200);
    const newAccessToken = getCookie(res, "accessToken");
    const newRefreshToken = getCookie(res, "refreshToken");
    expect(newAccessToken).toBeTruthy();
    expect(newRefreshToken).toBeTruthy();
    expect(newRefreshToken).not.toBe(refreshToken);

    // The new access token actually works.
    const meRes = await request(app).get("/api/auth/me").set("Cookie", `accessToken=${newAccessToken}`);
    expect(meRes.status).toBe(200);
  });

  it("rejects an unknown/garbage refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh").set("Cookie", "refreshToken=totally-made-up-token");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("rejects a reused (already rotated) refresh token and revokes the session", async () => {
    const { res: registerRes } = await registerCustomer();
    const originalRefreshToken = getCookie(registerRes, "refreshToken");

    const firstRefresh = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${originalRefreshToken}`);
    expect(firstRefresh.status).toBe(200);
    const rotatedRefreshToken = getCookie(firstRefresh, "refreshToken");

    // Reusing the original (now-rotated-away) token must fail...
    const reuseAttempt = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${originalRefreshToken}`);
    expect(reuseAttempt.status).toBe(401);
    expect(reuseAttempt.body.error.code).toBe("INVALID_REFRESH_TOKEN");

    // ...and, because reuse looks like theft, the token issued by that first
    // rotation is revoked too (whole session family invalidated).
    const secondRefreshAttempt = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${rotatedRefreshToken}`);
    expect(secondRefreshAttempt.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("invalidates the refresh token so it can no longer be used", async () => {
    const { res: registerRes } = await registerCustomer();
    const refreshToken = getCookie(registerRes, "refreshToken");

    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", `refreshToken=${refreshToken}`);
    expect(logoutRes.status).toBe(200);

    const refreshAfterLogout = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${refreshToken}`);
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("clears both auth cookies", async () => {
    const res = await request(app).post("/api/auth/logout");
    const setCookies = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
    expect(cookies.some((c) => c.startsWith("accessToken=;") || c.includes("accessToken=;"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken=;") || c.includes("refreshToken=;"))).toBe(true);
  });
});

describe("requireRole middleware", () => {
  it("rejects a request whose authenticated role isn't in the allowed list", () => {
    const middleware = requireRole("MENTOR" as Role);
    const req = { user: { userId: "user-1", role: "CUSTOMER" as Role } } as any;
    const next = vi.fn();

    middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = next.mock.calls[0]![0];
    expect(errorArg.statusCode).toBe(403);
    expect(errorArg.code).toBe("FORBIDDEN");
  });

  it("allows a request whose authenticated role is in the allowed list", () => {
    const middleware = requireRole("MENTOR" as Role, "CUSTOMER" as Role);
    const req = { user: { userId: "user-1", role: "CUSTOMER" as Role } } as any;
    const next = vi.fn();

    middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });
});
