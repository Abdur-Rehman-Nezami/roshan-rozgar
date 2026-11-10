export const APP_NAME = "Roshan Rozgar";
export const APP_NAME_UR = "روشن روزگار";
export const LANGUAGES = ["ur", "roman", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const AI_MODES = ["live", "fake", "off"] as const;
export type AiMode = (typeof AI_MODES)[number];

export const DEFAULT_TIMEZONE = "Asia/Karachi";
export const OFFER_TTL_SECONDS = 60;
export const HOLD_TTL_SECONDS = 5 * 60;
export const SWEEPER_INTERVAL_MS = 15_000;

export function directionFor(language: Language): "rtl" | "ltr" {
  return language === "ur" ? "rtl" : "ltr";
}
