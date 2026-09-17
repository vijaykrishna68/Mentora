import { apiRequest } from "@/lib/api/client";
import type { User } from "@/types";
import type { LoginInput, RegisterInput } from "./schemas";

export function fetchCurrentUser(): Promise<{ user: User }> {
  return apiRequest("/auth/me");
}

export function register(input: RegisterInput): Promise<{ user: User }> {
  return apiRequest("/auth/register", { method: "POST", body: input });
}

export function login(input: LoginInput): Promise<{ user: User }> {
  return apiRequest("/auth/login", { method: "POST", body: input });
}

export function logout(): Promise<void> {
  return apiRequest("/auth/logout", { method: "POST" });
}
