import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PropsWithChildren } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { MVP_AREAS, MVP_TASKS } from "@roshan/shared";
import type {
  MvpBooking,
  MvpCommand,
  Trade,
  MvpState,
  MvpWorker,
  ScreenId,
  User,
} from "@roshan/shared";
import { ApiClient, ApiError } from "../api/client.ts";
import { AppShell } from "./AppShell.tsx";
import { usePreferences } from "./preferences.tsx";

type Run = (command: MvpCommand) => Promise<{ ok: true; id?: string | undefined } | undefined>;
function Card({ children }: PropsWithChildren) {
  return <section className="mvp-card">{children}</section>;
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100000000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="field">
      {label}
      <input
        type="number"
        inputMode="numeric"
        required
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function Status({ status }: { status: string }) {
  const { t } = usePreferences();
  const labels: Record<string, string> = {
    ...t.mvp,
    confirmed: t.mvp.confirmedStatus,
    arrived: t.mvp.arrivedStatus,
  };
  return <span className={`status status-${status}`}>{labels[status] ?? status}</span>;
}
function Profile({
  own,
  user,
  run,
  busy,
}: {
  own: MvpWorker | undefined;
  user: User;
  run: Run;
  busy: boolean;
}) {
  const { t, language } = usePreferences();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name?.roman ?? "");
  const [years, setYears] = useState(own?.years ?? 0);
  const [trades, setTrades] = useState<Trade[]>((own?.trades ?? []) as Trade[]);
  const [areas, setAreas] = useState<string[]>(own?.areas.length ? own.areas : [MVP_AREAS[0].id]);
  const [min, setMin] = useState(own?.rateMin ?? 500);
  const [max, setMax] = useState(own?.rateMax ?? 1500);
  const [review, setReview] = useState(false);
  const toggle = (items: string[], id: string) =>
    items.includes(id) ? items.filter((v) => v !== id) : [...items, id];
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!review) {
      setReview(true);
      return;
    }
    const result = await run({
      action: "profile",
      profile: { name, years, trades, areas, rateMin: min, rateMax: max },
    });
    if (result) navigate("/w/home");
  };
  return (
    <Card>
      <h2>{t.mvp.profile}</h2>
      <form className="mvp-form" onSubmit={(e) => void submit(e)}>
        {review ? (
          <>
            <p>
              <strong>{name}</strong> · {years} {t.mvp.years}
            </p>
            <p>
              {MVP_TASKS.filter((v) => trades.includes(v.trade))
                .map((v) => v.label[language])
                .join(" · ")}
            </p>
            <p>
              {MVP_AREAS.filter((v) => areas.includes(v.id))
                .map((v) => v.label[language])
                .join(" · ")}
            </p>
            <p>
              Rs {min} – {max}
            </p>
            <button type="button" onClick={() => setReview(false)}>
              {t.mvp.edit}
            </button>
          </>
        ) : (
          <>
            <label className="field">
              {t.mvp.name}
              <input
                value={name}
                required
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <NumberField label={t.mvp.years} value={years} max={80} onChange={setYears} />
            <fieldset>
              <legend>{t.mvp.trades}</legend>
              <div className="tile-grid">
                {MVP_TASKS.map((v) => (
                  <label className="check-tile" key={v.trade}>
                    <input
                      type="checkbox"
                      checked={trades.includes(v.trade)}
                      onChange={() => setTrades(toggle(trades, v.trade) as Trade[])}
                    />
                    <span>
                      {v.icon} {v.label[language]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{t.mvp.areas}</legend>
              {MVP_AREAS.map((a) => (
                <label className="check-tile" key={a.id}>
                  <input
                    type="checkbox"
                    checked={areas.includes(a.id)}
                    onChange={() => setAreas(toggle(areas, a.id))}
                  />
                  {a.label[language]}
                </label>
              ))}
            </fieldset>
            <div className="two-col">
              <NumberField label={t.mvp.min} value={min} onChange={setMin} />
              <NumberField label={t.mvp.max} value={max} min={min} onChange={setMax} />
            </div>
          </>
        )}
        <button
          className="primary-button"
          disabled={busy || !trades.length || !areas.length}
          type="submit"
        >
          {review ? t.mvp.save : t.mvp.review}
        </button>
      </form>
    </Card>
  );
}
function RequestForm({
  user,
  state,
  run,
  busy,
}: {
  user: User;
  state: MvpState;
  run: Run;
  busy: boolean;
}) {
  const { t, language } = usePreferences();
  const navigate = useNavigate();
  const [task, setTask] = useState<string>(MVP_TASKS[0].id);
  const [description, setDescription] = useState("");
  const [area, setArea] = useState<string>(MVP_AREAS[0].id);
  const [address, setAddress] = useState("");
  const [when, setWhen] = useState("");
  const [name, setName] = useState(user.name?.roman ?? "");
  const rate = state.rates.find((r) => r.task === task);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await run({
      action: "request",
      task,
      description,
      areaId: area,
      address,
      name,
      ...(when ? { when: new Date(when).toISOString() } : {}),
    });
    if (result?.id) navigate(`/c/request/${result.id}/workers`);
  };
  return (
    <Card>
      <h2>{t.mvp.newRequest}</h2>
      <form className="mvp-form" onSubmit={(e) => void submit(e)}>
        <label className="field">
          {t.mvp.name}
          <input value={name} required maxLength={100} onChange={(e) => setName(e.target.value)} />
        </label>
        <fieldset>
          <legend>{t.mvp.task}</legend>
          <div className="tile-grid">
            {MVP_TASKS.map((v) => (
              <label className="check-tile" key={v.id}>
                <input
                  type="radio"
                  name="task"
                  checked={task === v.id}
                  onChange={() => setTask(v.id)}
                />
                <span>
                  {v.icon} {v.label[language]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {rate && (
          <p className="source-chip">
            Rs {rate.min.toLocaleString()}–{rate.max.toLocaleString()} · {t.mvp.priceSource}
          </p>
        )}
        <label className="field">
          {t.mvp.description}
          <textarea
            value={description}
            required
            minLength={3}
            maxLength={2000}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field">
          {t.mvp.area}
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {MVP_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label[language]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t.mvp.address}
          <textarea
            value={address}
            required
            minLength={3}
            maxLength={1000}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <label className="field">
          {t.mvp.when}
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <p>{t.mvp.private}</p>
        <button className="primary-button" disabled={busy}>
          {t.mvp.find}
        </button>
      </form>
    </Card>
  );
}
function Review({ booking, run, busy }: { booking: MvpBooking; run: Run; busy: boolean }) {
  const { t } = usePreferences();
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [tags, setTags] = useState({
    on_time: true,
    fair_price: true,
    clean: true,
    quality: true,
    hire_again: true,
  });
  return (
    <form
      className="mvp-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ action: "review", bookingId: booking.id, stars, text, tags });
      }}
    >
      <NumberField label={t.mvp.stars} value={stars} min={1} max={5} onChange={setStars} />
      <div className="tile-grid">
        {(Object.keys(tags) as (keyof typeof tags)[]).map((key) => (
          <label className="check-tile" key={key}>
            <input
              type="checkbox"
              checked={tags[key]}
              onChange={() => setTags({ ...tags, [key]: !tags[key] })}
            />
            {t.mvp[key]}
          </label>
        ))}
      </div>
      <label className="field">
        {t.mvp.feedback}
        <textarea
          value={text}
          required
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <button className="primary-button" disabled={busy}>
        {t.mvp.postReview}
      </button>
    </form>
  );
}
function Booking({
  booking: b,
  user,
  run,
  busy,
  now,
}: {
  booking: MvpBooking;
  user: User;
  run: Run;
  busy: boolean;
  now: number;
}) {
  const { t } = usePreferences();
  const worker = user.id === b.workerId;
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState(b.finalAmount ?? b.price);
  const seconds = b.expiresAt
    ? Math.max(0, Math.ceil((new Date(b.expiresAt).getTime() - now) / 1000))
    : 0;
  const next = {
    confirmed: "on_the_way",
    on_the_way: "arrived",
    arrived: "in_progress",
    in_progress: "completed",
  } as const;
  const status = b.status in next ? next[b.status as keyof typeof next] : null;
  const labels = {
    on_the_way: t.mvp.onWay,
    arrived: t.mvp.arrived,
    in_progress: t.mvp.begin,
    completed: t.mvp.finish,
  };
  return (
    <Card>
      <div className="card-title">
        <h3>{t.mvp.bookings}</h3>
        <Status status={b.status} />
      </div>
      <p>
        {t.mvp.agreed}: <strong>Rs {b.price.toLocaleString()}</strong>
      </p>
      {b.status === "held" && (
        <>
          <p>{t.mvp.bothConfirm}</p>
          <p role="timer">
            {t.mvp.time}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </p>
          <p>
            {b.customerConfirmed ? "✓" : "○"} {t.mvp.customerConfirmed} ·{" "}
            {b.workerConfirmed ? "✓" : "○"} {t.mvp.workerConfirmed}
          </p>
          <button
            className="primary-button"
            disabled={busy || !seconds || (worker ? b.workerConfirmed : b.customerConfirmed)}
            onClick={() => void run({ action: "confirm", bookingId: b.id })}
          >
            {t.mvp.confirm}
          </button>
        </>
      )}
      {b.address && <p className="notice">📍 {b.address}</p>}
      {!worker &&
        b.code &&
        ["confirmed", "on_the_way", "arrived", "in_progress"].includes(b.status) && (
          <p>
            {t.mvp.arrivalCode}: <strong dir="ltr">{b.code}</strong>
          </p>
        )}
      {worker && status && (
        <form
          className="mvp-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run({
              action: "status",
              bookingId: b.id,
              status,
              ...(status === "arrived" ? { code } : {}),
              ...(status === "completed" ? { amount } : {}),
            });
          }}
        >
          {status === "arrived" && (
            <label className="field">
              {t.mvp.arrivalCode}
              <input
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={code}
                required
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}
          {status === "completed" && (
            <NumberField label={t.mvp.price} value={amount} onChange={setAmount} />
          )}
          <button className="primary-button" disabled={busy}>
            {labels[status]}
          </button>
        </form>
      )}
      {b.status === "in_progress" && b.finalAmount !== null && (
        <>
          <p>
            {t.mvp.price}: <strong>Rs {b.finalAmount.toLocaleString()}</strong>
          </p>
          {!worker && (
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void run({ action: "complete", bookingId: b.id })}
            >
              {t.mvp.cash}
            </button>
          )}
        </>
      )}
      {["held", "confirmed"].includes(b.status) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(t.mvp.cancel + "?"))
              void run({ action: "cancel", bookingId: b.id, reason: "Cancelled by participant" });
          }}
        >
          {t.mvp.cancel}
        </button>
      )}
      {b.status === "completed" && (
        <>
          <p>
            ✓ {t.mvp.done} · DEMO {t.mvp.price}: Rs {b.finalAmount?.toLocaleString()}
          </p>
          {!worker &&
            (b.reviewed ? <p>{t.mvp.reviewed}</p> : <Review booking={b} run={run} busy={busy} />)}
        </>
      )}
    </Card>
  );
}
function Thread({
  id,
  state,
  user,
  run,
  busy,
  now,
}: {
  id: string;
  state: MvpState;
  user: User;
  run: Run;
  busy: boolean;
  now: number;
}) {
  const { t, language } = usePreferences();
  const [text, setText] = useState("");
  const [price, setPrice] = useState(1000);
  const thread = state.threads.find((v) => v.id === id);
  if (!thread) return <p>{t.mvp.loading}</p>;
  const messages = state.messages.filter((v) => v.threadId === id);
  const latest = messages.filter((v) => ["price_proposal", "price_accept"].includes(v.kind)).at(-1);
  const booking = state.bookings.find(
    (v) => v.threadId === id && !["expired", "cancelled"].includes(v.status),
  );
  const request = state.requests.find((v) => v.id === thread.requestId);
  return (
    <>
      <Card>
        <h2>
          {t.mvp.chat}: {user.role === "worker" ? thread.customerName : thread.workerName}
        </h2>
        <p>{request?.description}</p>
        <div className="messages" role="log" aria-label={t.mvp.chat}>
          {messages.map((m) => (
            <div className={`message ${m.senderId === user.id ? "mine" : ""}`} key={m.id}>
              <small>
                {m.senderId === thread.workerId ? thread.workerName : thread.customerName}
              </small>
              {m.kind === "text" ? (
                <p>{m.text}</p>
              ) : (
                <p>
                  {m.kind === "price_accept" ? "✓ " + t.mvp.agreed : t.mvp.propose}:{" "}
                  <strong>Rs {m.price?.toLocaleString()}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
        <form
          className="mvp-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run({ action: "message", threadId: id, text, lang: language }).then((r) => {
              if (r) setText("");
            });
          }}
        >
          <label className="field">
            {t.mvp.message}
            <textarea
              value={text}
              required
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button disabled={busy}>{t.mvp.send}</button>
        </form>
        {!booking && (
          <>
            <form
              className="mvp-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run({ action: "propose", threadId: id, price });
              }}
            >
              <NumberField label={t.mvp.price} value={price} onChange={setPrice} />
              <button disabled={busy}>{t.mvp.propose}</button>
            </form>
            {latest?.kind === "price_proposal" && latest.senderId !== user.id && (
              <button
                className="primary-button"
                disabled={busy}
                onClick={() =>
                  void run({ action: "acceptPrice", threadId: id, messageId: latest.id })
                }
              >
                {t.mvp.acceptPrice}: Rs {latest.price}
              </button>
            )}
            {latest?.kind === "price_accept" && (
              <p>
                ✓ {t.mvp.agreed}: Rs {latest.price}
              </p>
            )}
            {latest?.kind === "price_accept" && user.role === "customer" && (
              <button
                className="primary-button"
                disabled={busy}
                onClick={() => void run({ action: "hold", threadId: id })}
              >
                {t.mvp.hold}
              </button>
            )}
          </>
        )}
      </Card>
      {booking && <Booking booking={booking} user={user} run={run} busy={busy} now={now} />}
    </>
  );
}
export function MvpWorkspace({ screen }: { screen: ScreenId }) {
  const { t, language } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const client = useMemo(() => new ApiClient(window.location.origin), []);
  const [state, setState] = useState<MvpState | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const acting = useRef(false);
  const requestId = location.pathname.includes("/request/") ? params.id : undefined;
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const timeout = AbortSignal.timeout(12_000);
      const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      const [me, data] = await Promise.all([
        client.request("me", { signal: requestSignal }),
        client.request("mvpState", {
          signal: requestSignal,
          ...(requestId ? { query: { requestId } } : {}),
        }),
      ]);
      if (!requestSignal.aborted) {
        setUser(me.user);
        setState(data);
        setError("");
      }
    },
    [client, requestId],
  );
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        await refresh(controller.signal);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof ApiError ? e.message : t.mvp.error);
      } finally {
        loading = false;
      }
    };
    void load();
    const poll = setInterval(() => void load(), 3000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      controller.abort();
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [refresh, t.mvp.error]);
  const run: Run = async (body) => {
    if (acting.current) return;
    acting.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await client.request("mvpCommand", {
        body,
        signal: AbortSignal.timeout(12_000),
      });
      await refresh();
      setNotice(t.mvp.saved);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : t.mvp.error);
      return undefined;
    } finally {
      acting.current = false;
      setBusy(false);
    }
  };
  const own = state?.workers.find((w) => w.id === user?.id);
  const root = user?.role === "worker" ? "/w/home" : "/c/home";
  const profile = ["W3", "W4", "W5"].includes(screen);
  const selectedRequest = state?.requests.find((r) => r.id === requestId);
  const matched =
    state?.workers.filter(
      (w) =>
        w.free &&
        w.complete &&
        selectedRequest &&
        w.trades.includes(selectedRequest.trade) &&
        (w.areas.includes(selectedRequest.areaId) || (w.km !== null && w.km <= 8)),
    ) ?? [];
  const threadId = ["W9", "C6"].includes(screen) ? params.id : undefined;
  const selectedBooking = ["W10", "W11", "C7", "C8", "C9", "C10"].includes(screen)
    ? state?.bookings.find((b) => b.id === params.id)
    : undefined;
  return (
    <AppShell screen={screen}>
      <h1 id="screen-title" tabIndex={-1}>
        {t.screens[screen]}
      </h1>
      <nav className="mvp-nav">
        <Link to={root}>{t.mvp.backHome}</Link>
        {user?.role === "worker" && <Link to="/w/trades">{t.mvp.edit}</Link>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh().catch(() => setError(t.mvp.error))}
        >
          {t.mvp.refresh}
        </button>
      </nav>
      {error && (
        <p className="form-error" role="alert">
          {error}{" "}
          <Link to={location.pathname.startsWith("/w/") ? "/w/phone" : "/c/signup"}>
            {t.mvp.signIn}
          </Link>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!state || !user ? (
        <p role="status">{t.mvp.loading}</p>
      ) : profile ? (
        <Profile own={own} user={user} run={run} busy={busy} />
      ) : threadId ? (
        <Thread id={threadId} state={state} user={user} run={run} busy={busy} now={now} />
      ) : selectedBooking ? (
        <Booking booking={selectedBooking} user={user} run={run} busy={busy} now={now} />
      ) : (
        <>
          {user.role === "worker" && (
            <>
              <Card>
                <h2>{user.name?.roman ?? t.mvp.profile}</h2>
                <p>{own?.free ? "🟢 " + t.mvp.available : t.mvp.unavailable}</p>
                <p>
                  {own?.jobs ?? 0} {t.mvp.jobs} · ★ {own?.rating?.toFixed(1) ?? "—"} (
                  {own?.reviews ?? 0} {t.mvp.reviews})
                </p>
                {own?.seeded && <p className="source-chip">{t.mvp.seeded}</p>}
                {!own?.complete ? (
                  <Link className="primary-link" to="/w/trades">
                    {t.mvp.profile}
                  </Link>
                ) : (
                  <button
                    className="primary-button"
                    disabled={
                      busy ||
                      state.bookings.some((b) =>
                        ["held", "confirmed", "on_the_way", "arrived", "in_progress"].includes(
                          b.status,
                        ),
                      )
                    }
                    onClick={() => void run({ action: "availability", free: !own.free })}
                  >
                    {own.free ? t.mvp.goOff : t.mvp.goFree}
                  </button>
                )}
              </Card>
              <h2>{t.mvp.requests}</h2>
              {state.offers
                .filter((o) => o.status === "pending")
                .map((o) => {
                  const r = state.requests.find((r) => r.id === o.requestId);
                  return (
                    <Card key={o.id}>
                      <p>{r?.description}</p>
                      <p>{MVP_AREAS.find((a) => a.id === r?.areaId)?.label[language]}</p>
                      <p>
                        {t.mvp.time}:{" "}
                        {Math.max(0, Math.ceil((new Date(o.expiresAt).getTime() - now) / 1000))}s
                      </p>
                      <p>{t.mvp.private}</p>
                      <div className="two-col">
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run({ action: "respond", offerId: o.id, accept: true }).then(
                              (result) => {
                                if (result?.id) navigate(`/w/thread/${result.id}`);
                              },
                            )
                          }
                        >
                          {t.mvp.accept}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run({ action: "respond", offerId: o.id, accept: false })
                          }
                        >
                          {t.mvp.decline}
                        </button>
                      </div>
                    </Card>
                  );
                })}
            </>
          )}
          {user.role === "customer" && !selectedRequest && !["C5", "C11"].includes(screen) && (
            <RequestForm user={user} state={state} run={run} busy={busy} />
          )}
          {selectedRequest && (
            <>
              <Card>
                <h2>{selectedRequest.description}</h2>
                <Status status={selectedRequest.status} />
                <p>{MVP_AREAS.find((a) => a.id === selectedRequest.areaId)?.label[language]}</p>
                <p>{t.mvp.private}</p>
              </Card>
              <h2>{t.mvp.matches}</h2>
              {!matched.length && <p>{t.mvp.noWorkers}</p>}
              {matched.map((w) => {
                const offered = state.offers.find(
                  (o) => o.workerId === w.id && o.requestId === selectedRequest.id,
                );
                return (
                  <Card key={w.id}>
                    <h3>{w.name}</h3>
                    <p>
                      ★ {w.rating?.toFixed(1) ?? "—"} · {w.reviews} {t.mvp.reviews} · {w.jobs}{" "}
                      {t.mvp.jobs}
                    </p>
                    <p>
                      {t.mvp.free} ✓ {w.km !== null && ` · ${w.km.toFixed(1)} km`}
                    </p>
                    <p>
                      Rs {w.rateMin}–{w.rateMax}
                    </p>
                    {w.seeded && <p className="source-chip">{t.mvp.seeded}</p>}
                    <Link to={`/c/worker/${w.id}`}>{t.mvp.view}</Link>
                    {offered ? (
                      <p>
                        <Status status={offered.status} />
                        {offered.threadId && (
                          <Link className="primary-link" to={`/c/thread/${offered.threadId}`}>
                            {t.mvp.chat}
                          </Link>
                        )}
                      </p>
                    ) : (
                      <button
                        className="primary-button"
                        disabled={busy || selectedRequest.status !== "open"}
                        onClick={() =>
                          void run({
                            action: "offer",
                            requestId: selectedRequest.id,
                            workerId: w.id,
                          })
                        }
                      >
                        {t.mvp.offer}
                      </button>
                    )}
                  </Card>
                );
              })}
            </>
          )}
          {screen === "C5" &&
            state.workers
              .filter((w) => w.id === params.id)
              .map((w) => (
                <Card key={w.id}>
                  <h2>{w.name}</h2>
                  <p>
                    {w.years} {t.mvp.years} · ★ {w.rating?.toFixed(1) ?? "—"}
                  </p>
                  <p>{w.summary}</p>
                  {w.seeded && <p>{t.mvp.seeded}</p>}
                  {state.reviews
                    .filter((v) => v.workerId === w.id)
                    .map((v) => (
                      <blockquote key={v.id}>
                        ★ {v.stars} · {v.text}
                      </blockquote>
                    ))}
                </Card>
              ))}
          <h2>{t.mvp.chat}</h2>
          {!state.threads.length && <p>{t.mvp.empty}</p>}
          {state.threads.map((thread) => (
            <Link
              className="list-link"
              key={thread.id}
              to={`${user.role === "worker" ? "/w" : "/c"}/thread/${thread.id}`}
            >
              {user.role === "worker" ? thread.customerName : thread.workerName} ·{" "}
              {state.requests.find((r) => r.id === thread.requestId)?.description} →
            </Link>
          ))}
          {user.role === "customer" && !selectedRequest && (
            <>
              <h2>{t.mvp.requests}</h2>
              {state.requests.map((r) => (
                <Link className="list-link" key={r.id} to={`/c/request/${r.id}/workers`}>
                  {r.description} · <Status status={r.status} />
                </Link>
              ))}
            </>
          )}
          <h2>{t.mvp.bookings}</h2>
          {!state.bookings.length && <p>{t.mvp.empty}</p>}
          {state.bookings.map((b) => (
            <Booking key={b.id} booking={b} user={user} run={run} busy={busy} now={now} />
          ))}
          {user.role === "worker" && (
            <>
              <h2>{t.mvp.history}</h2>
              {state.reviews
                .filter((v) => v.workerId === user.id)
                .map((v) => (
                  <Card key={v.id}>
                    ★ {v.stars} · {v.text}
                  </Card>
                ))}
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
