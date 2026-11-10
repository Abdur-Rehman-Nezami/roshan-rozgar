import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { enableBrowserDemo } from "../demo/store.ts";
import { LANGUAGES } from "@roshan/shared";
import { AppShell } from "./AppShell.tsx";
import { usePreferences } from "./preferences.tsx";

const languageNames = { ur: "اردو", roman: "Roman Urdu", en: "English" } as const;
export function Welcome() {
  const [step, setStep] = useState<"start" | "language" | "role">("start");
  const { language, setLanguage, t } = usePreferences();
  const navigate = useNavigate();
  const demo = (role: "worker" | "customer") => {
    enableBrowserDemo(role);
    navigate(role === "worker" ? "/w/home" : "/c/home");
  };
  return (
    <AppShell
      screen="W0"
      promptId={step === "start" ? "p.start" : step === "language" ? "p.welcome" : "p.role"}
      onBack={() => setStep(step === "role" ? "language" : "start")}
    >
      <section className="welcome">
        <p className="brand-urdu" lang="ur" dir="rtl">
          روشن روزگار
        </p>
        <h1 id="screen-title" tabIndex={-1}>
          {step === "start" ? t.welcome : step === "language" ? t.chooseLanguage : t.role}
        </h1>
        {step === "start" && (
          <section className="demo-launch">
            <h2>{t.mvp.tryDemo}</h2>
            <p>{t.mvp.browserDemo}</p>
            <div className="two-col">
              <button type="button" onClick={() => demo("worker")}>
                🛠 {t.worker}
              </button>
              <button type="button" onClick={() => demo("customer")}>
                🏠 {t.customer}
              </button>
            </div>
          </section>
        )}
        {step === "start" && (
          <button className="primary-button" type="button" onClick={() => setStep("language")}>
            <span aria-hidden="true">▶</span> {t.start}
          </button>
        )}
        {step === "language" && (
          <>
            <div className="languages">
              {LANGUAGES.map((value) => (
                <button
                  type="button"
                  key={value}
                  lang={value === "roman" ? "ur-Latn" : value}
                  aria-pressed={language === value}
                  onClick={() => setLanguage(value)}
                >
                  {languageNames[value]}
                </button>
              ))}
            </div>
            <button className="primary-button" type="button" onClick={() => setStep("role")}>
              {t.next} <span aria-hidden="true">✓</span>
            </button>
          </>
        )}
        {step === "role" && (
          <div className="role-choices">
            <Link className="role-card" to="/w/mic">
              <span aria-hidden="true">🛠</span>
              <strong>{t.worker}</strong>
            </Link>
            <Link className="role-card" to="/c/signup">
              <span aria-hidden="true">🏠</span>
              <strong>{t.customer}</strong>
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
