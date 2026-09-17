import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
      };
      // Express 5's req.query is a getter with no setter, so validated query
      // data is attached here instead of reassigning req.query.
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
