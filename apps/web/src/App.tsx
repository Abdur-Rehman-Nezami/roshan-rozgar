import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { SCREEN_IDS, SCREEN_ROUTES } from "@roshan/shared";
import type { ScreenId } from "@roshan/shared";
import { AppShell } from "./app/AppShell.tsx";
import { PreferencesProvider, usePreferences } from "./app/preferences.tsx";
import { Welcome } from "./app/Welcome.tsx";

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
          {SCREEN_IDS.filter((screen) => screen !== "W0" && SCREEN_ROUTES[screen] !== null).map(
            (screen) => (
              <Route
                key={screen}
                path={SCREEN_ROUTES[screen] as string}
                element={<Placeholder screen={screen} />}
              />
            ),
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </PreferencesProvider>
  );
}
