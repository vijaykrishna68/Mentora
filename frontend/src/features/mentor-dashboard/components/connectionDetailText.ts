import type { ConnectionMode } from "@/types";

/**
 * A missing connectionDetail is expected for GOOGLE_MEET/ZOOM (no meeting-
 * link integration in v1 — never fabricate one) and IN_PERSON (no detail
 * applies). Only PHONE is genuinely surprising when null (the mentor simply
 * had no phone number on file at booking time).
 */
export function connectionDetailText(mode: ConnectionMode, detail: string | null): string | null {
  if (detail) return detail;

  switch (mode) {
    case "GOOGLE_MEET":
    case "ZOOM":
      return "Link available once meeting integration is added";
    case "PHONE":
      return "No phone number on file";
    case "IN_PERSON":
      return null;
  }
}
