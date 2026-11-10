import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { PROMPTS, SCREEN_PROMPTS } from "@roshan/shared";
import type { PromptId, ScreenId } from "@roshan/shared";
import { usePreferences } from "./preferences.tsx";

export function AppShell({
  children,
  screen = "W0",
  promptId,
  onBack,
}: PropsWithChildren<{ screen?: ScreenId; promptId?: PromptId; onBack?: () => void }>) {
  const { language, t, setLanguage } = usePreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    document.getElementById("screen-title")?.focus();
  }, [location.pathname, promptId]);
  return (
    <div className="app-shell">
      <header className="shell-header">
        <Link to="/" className="brand">
          {t.brand}
        </Link>
        <label>
          <span className="sr-only">{t.chooseLanguage}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as typeof language)}
          >
            <option value="ur" lang="ur">
              اردو
            </option>
            <option value="roman" lang="ur-Latn">
              Roman Urdu
            </option>
            <option value="en" lang="en">
              English
            </option>
          </select>
        </label>
      </header>
      <div className="preview-banner">DEMO · {t.auth.demo}</div>
      {!online && (
        <div className="offline-banner" role="alert">
          {t.offline}
        </div>
      )}
      <main className="screen-content">{children}</main>
      <aside className="captions" aria-label={t.captions} aria-live="polite">
        <p>{PROMPTS[promptId ?? SCREEN_PROMPTS[screen]][language]}</p>
      </aside>
      <footer className="shell-controls">
        <button
          type="button"
          onClick={() =>
            onBack ? onBack() : window.history.state?.idx > 0 ? navigate(-1) : navigate("/")
          }
        >
          <span aria-hidden="true">{language === "ur" ? "→" : "←"}</span> {t.back}
        </button>
        <button
          type="button"
          disabled
          title={t.audioUnavailable}
          aria-label={`${t.microphone}: ${t.audioUnavailable}`}
          className="mic-button"
        >
          <span aria-hidden="true">🎙</span>
          <span>{t.microphone}</span>
        </button>
        <button type="button" disabled title={t.audioUnavailable}>
          <span aria-hidden="true">🔈</span> {t.repeat}
        </button>
      </footer>
      <p className="voice-note">{t.audioUnavailable}</p>
    </div>
  );
}
