import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { MVP_TASKS, PROMPTS, SCREEN_PROMPTS } from "@roshan/shared";
import type { PromptId, ScreenId } from "@roshan/shared";
import { usePreferences } from "./preferences.tsx";
import {
  browserDemoEnabled,
  enableBrowserDemo,
  getBrowserDemo,
  openDemoPath,
  isStandaloneDemo,
} from "../demo/store.ts";

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
      {browserDemoEnabled() && (
        <div className="browser-demo-banner">
          <strong>{t.mvp.browserDemo}</strong>
          <div className="demo-actions">
            <label>
              <span className="sr-only">{t.mvp.demoWorker}</span>
              <select
                aria-label={t.mvp.demoWorker}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    getBrowserDemo().selectWorker(e.target.value);
                    openDemoPath("/w/home");
                  }
                }}
              >
                <option value="">{t.mvp.demoWorker}</option>
                {MVP_TASKS.map((task) => (
                  <option key={task.trade} value={task.trade}>
                    {task.icon} {task.label[language]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                enableBrowserDemo("worker");
                openDemoPath("/w/home");
              }}
            >
              {t.worker}
            </button>
            <button
              type="button"
              onClick={() => {
                enableBrowserDemo("customer");
                openDemoPath("/c/home");
              }}
            >
              {t.customer}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t.mvp.resetDemo + "?")) {
                  getBrowserDemo().reset();
                  openDemoPath("/");
                }
              }}
            >
              {t.mvp.resetDemo}
            </button>
            {!isStandaloneDemo() && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("rr.browserDemo");
                  openDemoPath("/");
                }}
              >
                {t.mvp.useServer}
              </button>
            )}
          </div>
        </div>
      )}
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
