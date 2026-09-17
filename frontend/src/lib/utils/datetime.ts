/**
 * All appointment timestamps from the backend are UTC ISO instants
 * (03c §41/§30). Every conversion here goes through Intl's timezone-aware
 * formatters — never manual offset arithmetic, and never an assumption
 * that a bare timestamp is already in the viewer's local time.
 *
 * Locale is pinned to "en-US" rather than left to the runtime default
 * (`undefined`): the product's own copy is already fixed US-style English
 * ("8:00 PM", "Tuesday, September 22"), so a viewer's OS/browser locale
 * would otherwise produce inconsistent-looking output (24-hour clock,
 * day-before-month order, lowercase am/pm) without actually localizing
 * anything else in the product. This also makes formatting deterministic
 * for tests, independent of the machine running them.
 */

const LOCALE = "en-US";

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatTime(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoUtc));
}

export function formatDate(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(isoUtc));
}

export function formatDateTime(isoUtc: string, timeZone: string): string {
  return `${formatDate(isoUtc, timeZone)} · ${formatTime(isoUtc, timeZone)}`;
}

/** e.g. "GMT+5:30" — the closest Intl gets to a numeric UTC offset label. */
export function formatUtcOffset(isoUtc: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(isoUtc));
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

/** e.g. "IST" where the locale/timezone has a common abbreviation, else the offset. */
export function formatTimezoneAbbreviation(isoUtc: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(new Date(isoUtc));
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

/**
 * For plain calendar dates (e.g. ExperienceEntry.startDate/endDate — a
 * `@db.Date`, not a UTC instant tied to wall-clock time). Formatted in UTC
 * deliberately: the viewer's local timezone could otherwise shift the
 * calendar date itself back or forward a day.
 */
export function formatMonthYear(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

/** Short weekday label for a date-picker pill, e.g. "Mon" — in the given timezone. */
export function formatWeekdayShort(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, weekday: "short" }).format(date);
}

/** Day-of-month number for a date-picker pill, e.g. "15" — in the given timezone. */
export function formatDayOfMonth(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, day: "numeric" }).format(date);
}

/** Full weekday + month + day + year, e.g. "Tuesday, September 22, 2026" — for the booking review. */
export function formatFullDate(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoUtc));
}

/**
 * A calendar-date key (YYYY-MM-DD) for the given Date, in the given
 * timezone — via Intl's en-CA locale, which formats that way natively.
 * Never manual getMonth()/getDate() arithmetic (that reads the *browser's*
 * local calendar, regardless of the timeZone you meant).
 */
export function toDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/**
 * Whether two IANA timezones actually produce a different wall-clock time
 * for the given instant. Deliberately NOT a string comparison of the zone
 * identifiers: IANA has legacy aliases for the same physical zone (e.g. a
 * browser resolving "Asia/Calcutta" while a mentor's profile stores
 * "Asia/Kolkata" — identical zone, different canonical spelling), which a
 * plain `a !== b` would misreport as "different timezones" and show a
 * redundant, identical-looking "mentor's time" row.
 */
export function timezonesDiffer(isoUtc: string, a: string, b: string): boolean {
  return formatDateTime(isoUtc, a) !== formatDateTime(isoUtc, b);
}
