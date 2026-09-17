import bcrypt from "bcrypt";
import { Prisma, Role, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../../lib/tokens.js";
import { REFRESH_TOKEN_MAX_AGE_MS } from "../../lib/cookies.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";

const BCRYPT_ROUNDS = 12;

// A bcrypt hash of an arbitrary, never-used password. Comparing against this
// when a user isn't found keeps login response timing similar for
// "unknown email" and "wrong password" so timing doesn't leak account
// existence in addition to the shared generic error message/code.
const DUMMY_BCRYPT_HASH = "$2b$12$wtVHPPiFJkmBpUenx8CTGuELNVoclR4UahJRCgLH6SaNpc/yyJK9.";

function sanitizeUser(user: User) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

async function issueTokens(userId: string, role: Role) {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
    },
  });
  return { accessToken, refreshToken };
}

function isUniqueEmailViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as string[]).includes("email")
  );
}

export async function registerCustomer(input: Extract<RegisterInput, { role: "CUSTOMER" }>) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: Role.CUSTOMER,
        name: input.name,
        interests: input.interests ?? [],
      },
    });
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
    }
    throw error;
  }

  const tokens = await issueTokens(user.id, user.role);
  return { user: sanitizeUser(user), ...tokens };
}

export async function registerMentor(input: Extract<RegisterInput, { role: "MENTOR" }>) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let user: User;
  try {
    // Nested write: User + a bare MentorProfile "shell" are created
    // atomically. The profile starts incomplete (no timezone, not accepting
    // bookings, onboardingComplete=false) — a later onboarding phase fills
    // it in and flips onboardingComplete before the mentor can be
    // discoverable/bookable.
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: Role.MENTOR,
        name: input.name,
        mentorProfile: {
          create: {
            acceptingBookings: false,
            onboardingComplete: false,
          },
        },
      },
    });
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
    }
    throw error;
  }

  const tokens = await issueTokens(user.id, user.role);
  return { user: sanitizeUser(user), ...tokens };
}

export async function login(input: LoginInput) {
  const invalidCredentials = new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await bcrypt.compare(input.password, DUMMY_BCRYPT_HASH);
    throw invalidCredentials;
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw invalidCredentials;
  }

  const tokens = await issueTokens(user.id, user.role);
  return { user: sanitizeUser(user), ...tokens };
}

export async function refresh(rawRefreshToken: string) {
  const invalidRefreshToken = new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token.");
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing) {
    throw invalidRefreshToken;
  }

  if (existing.revokedAt) {
    // A revoked token being presented again means it was likely stolen and
    // used by someone other than whoever legitimately rotated it. Revoke the
    // user's entire active session set as a precaution.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw invalidRefreshToken;
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw invalidRefreshToken;
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user) {
    throw invalidRefreshToken;
  }

  // Rotation: the presented token is single-use.
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(user.id, user.role);
  return { user: sanitizeUser(user), ...tokens };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  const tokenHash = hashRefreshToken(rawRefreshToken);
  // Idempotent: logging out with an already-revoked/unknown token is a no-op,
  // not an error — the caller's cookies get cleared either way.
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "User no longer exists.");
  }
  return sanitizeUser(user);
}
