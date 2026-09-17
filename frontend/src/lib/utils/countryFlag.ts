/** ISO 3166-1 alpha-2 ("IN", "US") → flag emoji, via Unicode regional indicators. No image assets needed. */
export function countryFlagEmoji(iso2: string): string {
  const code = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  const REGIONAL_INDICATOR_OFFSET = 127397;
  return String.fromCodePoint(...[...code].map((char) => char.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
}
