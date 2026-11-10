import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { SCREEN_IDS, SCREEN_ROUTES } from "@roshan/shared";
import type { ScreenId } from "@roshan/shared";
import { AppShell } from "./app/AppShell.tsx";
import { PreferencesProvider, usePreferences } from "./app/preferences.tsx";
import { Welcome } from "./app/Welcome.tsx";
import { MicrophoneStep, SignIn } from "./app/SignIn.tsx";

function Placeholder({ screen }: { screen: ScreenId }) {
  const { t } = usePreferences();
  return (
    <AppShell screen={screen}>
      <h1 id="screen-title" tabIndex={-1}>
        {t.screens[screen]}
      </h1>
      <p className="notice">{t.unavailable}</p>
      <Link className="primary-link" to="/">
        {t.home}
      </Link>
    </AppShell>
  );
}
function NotFound() {
  const { t } = usePreferences();
  return (
    <AppShell>
      <h1 id="screen-title" tabIndex={-1}>
        {t.notFound}
      </h1>
      <Link to="/">{t.home}</Link>
    </AppShell>
  );
}
export function App() {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/w/mic" element={<MicrophoneStep />} />
          <Route path="/w/phone" element={<SignIn key="worker" role="worker" />} />
          <Route path="/c/signup" element={<SignIn key="customer" role="customer" />} />
          {SCREEN_IDS.filter(
            (screen) =>
              !["W0", "W1", "W2", "C1"].includes(screen) && SCREEN_ROUTES[screen] !== null,
          ).map((screen) => (
            <Route
              key={screen}
              path={SCREEN_ROUTES[screen] as string}
              element={<Placeholder screen={screen} />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </PreferencesProvider>
  );
}
