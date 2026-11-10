import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { OtpStartSchema, OtpVerifySchema } from "@roshan/shared";
import type { User } from "@roshan/shared";
import { ApiClient, ApiError } from "../api/client.ts";
import { AppShell } from "./AppShell.tsx";
import { usePreferences } from "./preferences.tsx";

export function SignIn({ role }: { role: "worker" | "customer" }) {
  const { t } = usePreferences();
  const client = useMemo(() => new ApiClient(window.location.origin), []);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<keyof typeof t.auth | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void client
      .request("me", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) })
      .then(
        (result) => {
          if (!controller.signal.aborted) setUser(result.user);
        },
        () => {
          // No session is normal. An unavailable server can be retried with the form.
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => {
      controller.abort();
      pending.current?.abort();
    };
  }, [client]);
  useEffect(() => {
    if (demoCode !== null) document.getElementById("otp-code")?.focus();
  }, [demoCode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || checking) return;
    const input =
      demoCode === null
        ? OtpStartSchema.safeParse({ phone, role })
        : OtpVerifySchema.safeParse({ phone, code });
    if (!input.success) {
      setError(demoCode === null ? "invalidPhone" : "invalidCode");
      return;
    }
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
    pending.current = controller;
    setBusy(true);
    setError(null);
    try {
      if (demoCode === null) {
        const result = await client.request("otpStart", {
          body: { phone, role },
          signal,
        });
        if (controller.signal.aborted) return;
        setDemoCode(result.demoCode);
        setCode(result.demoCode);
      } else {
        await client.request("otpVerify", { body: { phone, code }, signal });
        // Confirm that the browser retained the HttpOnly cookie before showing success.
        const current = await client.request("me", { signal });
        if (controller.signal.aborted) return;
        setUser(current.user);
        setDemoCode(null);
        setCode("");
        setPhone("");
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(
        failure instanceof ApiError
          ? failure.code === "RATE_LIMITED"
            ? "limited"
            : failure.code === "UNAUTHORIZED"
              ? "rejected"
              : failure.code === "FORBIDDEN"
                ? "roleConflict"
                : "unavailable"
          : "unavailable",
      );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (pending.current === controller) pending.current = null;
    }
  };
  const signedIn = user?.role === role;
  const reset = () => {
    setDemoCode(null);
    setCode("");
    setError(null);
  };
  return (
    <AppShell screen={role === "worker" ? "W2" : "C1"}>
      <h1 id="screen-title" tabIndex={-1}>
        {t.screens[role === "worker" ? "W2" : "C1"]}
      </h1>
      <p className="notice">{t.auth.demo}</p>
      {checking ? (
        <p role="status">{t.auth.checking}</p>
      ) : signedIn ? (
        <>
          <p role="status">{t.auth.signedIn}</p>
          <Link className="primary-link" to={role === "worker" ? "/w/trades" : "/c/home"}>
            {t.auth.continue}
          </Link>
        </>
      ) : (
        <form
          className="sign-in-form"
          onSubmit={(event) => void submit(event)}
          noValidate
          aria-busy={busy}
        >
          {user && <p>{t.auth.otherSession}</p>}
          <label htmlFor="phone">{t.auth.phone}</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            maxLength={30}
            disabled={busy || demoCode !== null}
            aria-describedby="phone-hint"
            onChange={(event) => setPhone(event.target.value)}
          />
          <p id="phone-hint">{t.auth.phoneHint}</p>
          {demoCode !== null && (
            <>
              <p className="demo-code">
                DEMO <strong dir="ltr">{demoCode}</strong>
              </p>
              <p>{t.auth.expires}</p>
              <label htmlFor="otp-code">{t.auth.code}</label>
              <input
                id="otp-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={6}
                value={code}
                disabled={busy}
                onChange={(event) =>
                  setCode(
                    event.target.value.replace(/[۰-۹٠-٩]/g, (digit) =>
                      String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
                    ),
                  )
                }
              />
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {t.auth[error]}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? t.auth.busy : demoCode === null ? t.auth.sendCode : t.auth.verify}
          </button>
          {demoCode !== null && (
            <button type="button" onClick={reset} disabled={busy}>
              {t.auth.resend}
            </button>
          )}
        </form>
      )}
    </AppShell>
  );
}

export function MicrophoneStep() {
  const { t } = usePreferences();
  return (
    <AppShell screen="W1">
      <h1 id="screen-title" tabIndex={-1}>
        {t.screens.W1}
      </h1>
      <p className="notice">{t.audioUnavailable}</p>
      <Link className="primary-link" to="/w/phone">
        {t.next}
      </Link>
    </AppShell>
  );
}
