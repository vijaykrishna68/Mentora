// Loaded by vitest before any test file's imports resolve, so this must run
// first: point the app at the dedicated test database (never the dev one)
// before anything imports the shared Prisma client.
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env.test"), override: true });

import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

beforeEach(async () => {
  // Full reset between tests — small suite, real Postgres, simplest reliable
  // isolation. Cascades to every table with an FK back to users.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" CASCADE;`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
