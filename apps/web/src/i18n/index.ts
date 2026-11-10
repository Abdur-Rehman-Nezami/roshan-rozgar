import ur from "./ur.json" with { type: "json" };
import roman from "./roman.json" with { type: "json" };
import en from "./en.json" with { type: "json" };
import type { Language } from "@roshan/shared";

export type Dictionary = typeof en;
export const dictionaries = { ur, roman, en } satisfies Record<Language, Dictionary>;
