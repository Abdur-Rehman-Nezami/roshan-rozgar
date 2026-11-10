import { useEffect, useState } from "react";
import { APP_NAME, APP_NAME_UR, directionFor, LANGUAGES } from "@roshan/shared";
import type { Language } from "@roshan/shared";

const copy = {
  ur: {
    language: "زبان چنیں",
    title: "روشن روزگار میں خوش آمدید",
    status: "ایپ کی تیاری جاری ہے۔ ابھی کام یا کاریگر بک نہیں ہو سکتا۔",
  },
  roman: {
    language: "Zabaan chunein",
    title: "Roshan Rozgar mein khush aamdeed",
    status: "App ki tayyari jaari hai. Abhi kaam ya kaarigar book nahi ho sakta.",
  },
  en: {
    language: "Choose your language",
    title: "Welcome to Roshan Rozgar",
    status: "This app is being built. Jobs and worker bookings are not available yet.",
  },
} satisfies Record<Language, { language: string; title: string; status: string }>;

const languageNames: Record<Language, string> = {
  ur: "اردو",
  roman: "Roman Urdu",
  en: "English",
};

export function App() {
  const [language, setLanguage] = useState<Language>("ur");
  useEffect(() => {
    document.documentElement.dir = directionFor(language);
    document.documentElement.lang = language === "roman" ? "ur-Latn" : language;
  }, [language]);

  return (
    <main className="welcome">
      <header>
        <p className="brand" lang="en" dir="ltr">
          {APP_NAME}
        </p>
        <p className="brand-urdu" lang="ur" dir="rtl">
          {APP_NAME_UR}
        </p>
      </header>
      <h1>{copy[language].title}</h1>
      <fieldset>
        <legend>{copy[language].language}</legend>
        <div className="languages">
          {LANGUAGES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={language === value}
              onClick={() => setLanguage(value)}
              lang={value === "roman" ? "ur-Latn" : value}
            >
              {languageNames[value]}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="notice" role="status" aria-live="polite">
        {copy[language].status}
      </p>
    </main>
  );
}
