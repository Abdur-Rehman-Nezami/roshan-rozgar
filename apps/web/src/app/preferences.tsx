import { createContext, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { directionFor, LanguageSchema } from "@roshan/shared";
import type { Language } from "@roshan/shared";
import { dictionaries } from "../i18n/index.ts";

const PreferencesContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
} | null>(null);
function initialLanguage(): Language {
  try {
    const saved = LanguageSchema.safeParse(localStorage.getItem("rr.language"));
    return saved.success ? saved.data : "ur";
  } catch {
    return "ur";
  }
}
export function PreferencesProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    document.documentElement.dir = directionFor(language);
    document.documentElement.lang = language === "roman" ? "ur-Latn" : language;
    try {
      localStorage.setItem("rr.language", language);
    } catch {
      /* Storage can be unavailable. */
    }
  }, [language]);
  return (
    <PreferencesContext.Provider value={{ language, setLanguage }}>
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("PreferencesProvider is missing");
  return { ...value, t: dictionaries[value.language] };
}
