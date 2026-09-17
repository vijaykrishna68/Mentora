import type { Category, Role } from "./enums";

/** Matches auth.service.ts `sanitizeUser` — the full User row minus passwordHash. */
export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  interests: Category[];
  createdAt: string;
  updatedAt: string;
}
