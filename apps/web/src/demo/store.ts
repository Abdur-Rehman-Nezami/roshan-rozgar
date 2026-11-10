import {
  MVP_AREAS,
  MVP_TASKS,
  MvpCommandSchema,
  MvpStateSchema,
  OtpStartSchema,
  OtpVerifySchema,
} from "@roshan/shared";
import type { MvpState, MvpCommand, User } from "@roshan/shared";

export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
interface Data extends MvpState {
  users: User[];
  owners: Record<string, string>;
  otp: Record<string, { code: string; role: "worker" | "customer"; until: number }>;
  availability: Record<string, boolean>;
}
export class DemoFailure extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code = "VALIDATION", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
const DATA = "rr.browser-demo.v1";
const SESSION = "rr.demo-user";
const uuid = () => crypto.randomUUID();
const user = (
  id: string,
  phone: string,
  role: User["role"],
  name: string,
  seeded = false,
): User => ({
  id,
  phone,
  role,
  name: { ur: name, roman: name, en: name },
  lang: "ur",
  areaId: null,
  coordinates: null,
  isSeeded: seeded,
  createdAt: new Date().toISOString(),
});
function initial(): Data {
  const workers = MVP_TASKS.map((task, i) => ({
    id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name: `DEMO ${["Ali", "Bilal", "Imran", "Sara", "Usman", "Ayesha", "Ahmed", "Raza"][i]}`,
    years: 5,
    rateMin: task.min,
    rateMax: task.max,
    free: true,
    complete: true,
    trades: [task.trade],
    areas: MVP_AREAS.map((a) => a.id),
    rating: null,
    reviews: 0,
    jobs: 0,
    seeded: true,
    summary: null,
    km: 1.2 + i * 0.3,
  }));
  return {
    workers,
    users: workers.map((w, i) =>
      user(w.id, `+9230000000${String(i + 1).padStart(2, "0")}`, "worker", w.name, true),
    ),
    requests: [],
    offers: [],
    threads: [],
    messages: [],
    bookings: [],
    reviews: [],
    rates: MVP_TASKS.map((t) => ({ task: t.id, min: t.min, max: t.max, seeded: true })),
    owners: {},
    otp: {},
    availability: Object.fromEntries(workers.map((w) => [w.id, true])),
  };
}
/** Explicit browser simulation. Production uses PostgreSQL; this is not a database race proof. */
export class BrowserDemo {
  private shared: DemoStorage;
  private session: DemoStorage;
  constructor(shared: DemoStorage, session: DemoStorage) {
    this.shared = shared;
    this.session = session;
  }
  private read(): Data {
    const raw = this.shared.getItem(DATA);
    if (raw) return JSON.parse(raw) as Data;
    const data = initial();
    this.save(data);
    return data;
  }
  private save(data: Data) {
    this.shared.setItem(DATA, JSON.stringify(data));
  }
  reset() {
    this.shared.removeItem(DATA);
    this.session.removeItem(SESSION);
    this.read();
  }
  private identity(data: Data) {
    const current = data.users.find((u) => u.id === this.session.getItem(SESSION));
    if (!current) throw new DemoFailure("Sign in to continue", "UNAUTHORIZED", 401);
    return current;
  }
  start(body: unknown) {
    const { phone, role } = OtpStartSchema.parse(body);
    const data = this.read();
    const code = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    data.otp[phone] = { code, role, until: Date.now() + 300000 };
    this.save(data);
    return { demo: true as const, demoCode: code };
  }
  verify(body: unknown) {
    const { phone, code } = OtpVerifySchema.parse(body);
    const data = this.read();
    const otp = data.otp[phone];
    if (!otp || otp.code !== code || otp.until < Date.now())
      throw new DemoFailure("Code expired or incorrect", "UNAUTHORIZED", 401);
    delete data.otp[phone];
    let current = data.users.find((u) => u.phone === phone);
    if (current && current.role !== otp.role)
      throw new DemoFailure("This number belongs to another role", "FORBIDDEN", 403);
    if (!current) {
      current = user(uuid(), phone, otp.role, "", false);
      data.users.push(current);
      if (current.role === "worker") {
        data.workers.push({
          id: current.id,
          name: "",
          years: null,
          rateMin: null,
          rateMax: null,
          free: false,
          complete: false,
          trades: [],
          areas: [],
          rating: null,
          reviews: 0,
          jobs: 0,
          seeded: false,
          summary: null,
          km: null,
        });
        data.availability[current.id] = false;
      }
    }
    this.session.setItem(SESSION, current.id);
    this.save(data);
    return { user: current };
  }
  me() {
    const data = this.read();
    return { user: this.identity(data) };
  }
  quick(role: "worker" | "customer") {
    const phone = role === "worker" ? "+923000000001" : "+923009999999";
    const { demoCode } = this.start({ phone, role });
    const result = this.verify({ phone, code: demoCode });
    if (role === "customer" && !result.user.name?.en) {
      const data = this.read();
      const u = data.users.find((u) => u.id === result.user.id)!;
      u.name = { ur: "ڈیمو گاہک", roman: "DEMO customer", en: "DEMO customer" };
      this.save(data);
    }
    return result;
  }
  selectWorker(trade: string) {
    const data = this.read();
    const w = data.workers.find((w) => w.seeded && w.trades.includes(trade));
    if (!w) throw new DemoFailure("Demo worker not found");
    this.session.setItem(SESSION, w.id);
  }
  private expire(data: Data) {
    const now = Date.now();
    for (const o of data.offers)
      if (o.status === "pending" && new Date(o.expiresAt).getTime() <= now) o.status = "expired";
    for (const b of data.bookings)
      if (b.status === "held" && b.expiresAt && new Date(b.expiresAt).getTime() <= now)
        b.status = "expired";
  }
  state(requestId?: string): MvpState {
    const data = this.read();
    const current = this.identity(data);
    this.expire(data);
    this.save(data);
    const result = structuredClone(data);
    const active = ["held", "confirmed", "on_the_way", "arrived", "in_progress"];
    const wanted = data.requests.find(
      (r) => r.id === requestId && data.owners[r.id] === current.id,
    );
    const start = wanted ? new Date(wanted.start).getTime() : Date.now();
    const end = wanted ? new Date(wanted.end).getTime() : start + 7200000;
    for (const w of result.workers) {
      w.free =
        !!data.availability[w.id] &&
        !data.bookings.some((b) => {
          const r = data.requests.find((r) => r.id === b.requestId);
          return (
            b.workerId === w.id &&
            active.includes(b.status) &&
            r &&
            new Date(r.start).getTime() < end &&
            new Date(r.end).getTime() > start
          );
        });
    }
    result.offers = result.offers.filter(
      (o) => o.workerId === current.id || data.owners[o.requestId] === current.id,
    );
    result.threads = result.threads.filter(
      (t) => t.workerId === current.id || t.customerId === current.id,
    );
    result.messages = result.messages.filter((m) =>
      result.threads.some((t) => t.id === m.threadId),
    );
    result.bookings = result.bookings.filter(
      (b) => b.workerId === current.id || b.customerId === current.id,
    );
    result.requests = result.requests.filter(
      (r) => data.owners[r.id] === current.id || result.offers.some((o) => o.requestId === r.id),
    );
    for (const r of result.requests)
      if (
        data.owners[r.id] !== current.id &&
        !result.bookings.some(
          (b) =>
            b.requestId === r.id &&
            b.workerId === current.id &&
            ["confirmed", "on_the_way", "arrived", "in_progress", "completed"].includes(b.status),
        )
      )
        r.address = null;
    for (const b of result.bookings) {
      if (b.customerId !== current.id) {
        b.code = null;
        if (["held", "expired", "cancelled"].includes(b.status)) b.address = null;
      }
    }
    return MvpStateSchema.parse({
      workers: result.workers,
      requests: result.requests,
      offers: result.offers,
      threads: result.threads,
      messages: result.messages,
      bookings: result.bookings,
      reviews: result.reviews,
      rates: result.rates,
    });
  }
  command(body: unknown) {
    const command = MvpCommandSchema.parse(body);
    const data = this.read();
    const current = this.identity(data);
    this.expire(data);
    const id = this.execute(data, current, command);
    this.save(data);
    return { ok: true as const, ...(id ? { id } : {}) };
  }
  private execute(d: Data, u: User, c: MvpCommand): string | undefined {
    const role = (r: string) => {
      if (u.role !== r)
        throw new DemoFailure("This action belongs to the other role", "FORBIDDEN", 403);
    };
    const fail = (message: string): never => {
      throw new DemoFailure(message);
    };
    const uid = u.id;
    if (c.action === "profile") {
      role("worker");
      const p = c.profile;
      const w = d.workers.find((w) => w.id === uid)!;
      u.name = { ur: p.name, roman: p.name, en: p.name };
      w.name = p.name;
      w.years = p.years;
      w.trades = p.trades;
      w.areas = p.areas;
      w.rateMin = p.rateMin;
      w.rateMax = p.rateMax;
      w.complete = true;
      return uid;
    }
    if (c.action === "availability") {
      role("worker");
      if (!d.workers.find((w) => w.id === uid)?.complete) fail("Save your profile first");
      d.availability[uid] = c.free;
      return uid;
    }
    if (c.action === "request") {
      role("customer");
      const task = MVP_TASKS.find((t) => t.id === c.task);
      if (!task || !MVP_AREAS.some((a) => a.id === c.areaId)) fail("Choose a task and area");
      const start = c.when ? new Date(c.when) : new Date();
      if (start.getTime() < Date.now() - 300000) fail("Choose a future time");
      u.name = { ur: c.name, roman: c.name, en: c.name };
      const id = uuid();
      d.requests.unshift({
        id,
        task: c.task,
        trade: task!.trade,
        description: c.description,
        areaId: c.areaId,
        start: start.toISOString(),
        end: new Date(start.getTime() + 7200000).toISOString(),
        status: "open",
        address: c.address,
      });
      d.owners[id] = uid;
      return id;
    }
    if (c.action === "offer") {
      role("customer");
      const r = d.requests.find((r) => r.id === c.requestId && d.owners[r.id] === uid);
      const w = this.state(c.requestId).workers.find((w) => w.id === c.workerId);
      if (
        !r ||
        r.status !== "open" ||
        !w?.free ||
        !w.complete ||
        !w.trades.includes(r.trade) ||
        (!w.areas.includes(r.areaId) && (w.km === null || w.km > 8))
      )
        fail("This worker is no longer available");
      if (d.offers.some((o) => o.requestId === r!.id && o.workerId === w!.id))
        fail("This worker was already requested; choose another");
      const id = uuid();
      d.offers.unshift({
        id,
        requestId: r!.id,
        workerId: w!.id,
        status: "pending",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        threadId: null,
      });
      return id;
    }
    if (c.action === "respond") {
      role("worker");
      const offer = d.offers.find(
        (o) => o.id === c.offerId && o.workerId === uid && o.status === "pending",
      );
      if (!offer) fail("Offer expired");
      const r = d.requests.find((r) => r.id === offer!.requestId)!;
      if (r.status !== "open") fail("Another worker accepted");
      offer!.status = c.accept ? "accepted" : "declined";
      if (!c.accept) return offer!.id;
      r.status = "matched";
      for (const o of d.offers)
        if (o.requestId === r.id && o.id !== offer!.id && o.status === "pending")
          o.status = "withdrawn";
      const customer = d.users.find((u) => u.id === d.owners[r.id])!;
      const id = uuid();
      offer!.threadId = id;
      d.threads.unshift({
        id,
        requestId: r.id,
        workerId: uid,
        customerId: customer.id,
        workerName: u.name?.roman ?? "Worker",
        customerName: customer.name?.roman ?? "Customer",
      });
      return id;
    }
    if ("threadId" in c) {
      const thread = d.threads.find(
        (t) => t.id === c.threadId && (t.workerId === uid || t.customerId === uid),
      );
      if (!thread) fail("Thread unavailable");
      const t = thread!;
      const booking = d.bookings.find(
        (b) => b.threadId === t.id && !["expired", "cancelled"].includes(b.status),
      );
      if (c.action === "message") {
        const id = uuid();
        d.messages.push({
          id,
          threadId: t.id,
          senderId: uid,
          kind: "text",
          text: c.text,
          price: null,
          createdAt: new Date().toISOString(),
        });
        return id;
      }
      if (booking) {
        if (c.action === "hold") return booking.id;
        fail("The booking price is locked");
      }
      if (c.action === "propose") {
        const id = uuid();
        d.messages.push({
          id,
          threadId: t.id,
          senderId: uid,
          kind: "price_proposal",
          text: null,
          price: c.price,
          createdAt: new Date().toISOString(),
        });
        return id;
      }
      if (c.action === "acceptPrice") {
        const m = d.messages
          .filter((m) => m.threadId === t.id && m.kind === "price_proposal")
          .at(-1);
        if (!m || m.id !== c.messageId || m.senderId === uid)
          fail("Accept the other person's latest proposal");
        const id = uuid();
        d.messages.push({
          id,
          threadId: t.id,
          senderId: uid,
          kind: "price_accept",
          text: null,
          price: m!.price,
          createdAt: new Date().toISOString(),
        });
        return id;
      }
      if (c.action === "hold") {
        role("customer");
        if (
          d.requests.find((r) => r.id === t.requestId)?.status !== "matched" ||
          !d.offers.some((o) => o.threadId === t.id && o.status === "accepted")
        )
          fail("This negotiation is no longer active");
        const price = d.messages
          .filter((m) => m.threadId === t.id && ["price_proposal", "price_accept"].includes(m.kind))
          .at(-1);
        if (price?.kind !== "price_accept") fail("Agree a price first");
        if (!this.state(t.requestId).workers.find((w) => w.id === t.workerId)?.free)
          throw new DemoFailure("Worker just became busy", "WORKER_ENGAGED", 409);
        const id = uuid();
        const r = d.requests.find((r) => r.id === t.requestId)!;
        d.bookings.unshift({
          id,
          threadId: t.id,
          requestId: t.requestId,
          workerId: t.workerId,
          customerId: t.customerId,
          status: "held",
          price: price!.price!,
          finalAmount: null,
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          customerConfirmed: false,
          workerConfirmed: false,
          code: String(Math.floor(Math.random() * 10000)).padStart(4, "0"),
          address: r.address,
          reviewed: false,
        });
        return id;
      }
    }
    if ("bookingId" in c) {
      const b = d.bookings.find(
        (b) => b.id === c.bookingId && (b.workerId === uid || b.customerId === uid),
      );
      if (!b) fail("Booking unavailable");
      const booking = b!;
      if (c.action === "confirm") {
        if (booking.status !== "held") fail("Hold expired");
        if (uid === booking.workerId) booking.workerConfirmed = true;
        else booking.customerConfirmed = true;
        if (booking.workerConfirmed && booking.customerConfirmed) booking.status = "confirmed";
      }
      if (c.action === "cancel") {
        if (!["held", "confirmed"].includes(booking.status)) fail("Cannot cancel at this stage");
        booking.status = "cancelled";
        d.requests.find((r) => r.id === booking.requestId)!.status = "open";
        const oldOffer = d.offers.find((o) => o.threadId === booking.threadId);
        if (oldOffer) oldOffer.status = "withdrawn";
      }
      if (c.action === "status") {
        role("worker");
        const previous = {
          on_the_way: "confirmed",
          arrived: "on_the_way",
          in_progress: "arrived",
          completed: "in_progress",
        }[c.status];
        if (booking.status !== previous) fail("Complete the previous step");
        if (c.status === "arrived" && c.code !== booking.code) fail("Incorrect DEMO arrival code");
        if (c.status === "completed") {
          if (c.amount === undefined) fail("Enter final amount");
          booking.finalAmount = c.amount!;
        } else booking.status = c.status;
      }
      if (c.action === "complete") {
        role("customer");
        if (booking.status !== "in_progress" || booking.finalAmount === null)
          fail("Wait for the worker's final amount");
        booking.status = "completed";
        const w = d.workers.find((w) => w.id === booking.workerId)!;
        w.jobs++;
        d.availability[w.id] = true;
      }
      if (c.action === "review") {
        role("customer");
        if (booking.status !== "completed" || booking.reviewed) fail("Review unavailable");
        booking.reviewed = true;
        d.reviews.unshift({
          id: uuid(),
          workerId: booking.workerId,
          stars: c.stars,
          text: c.text,
          seeded: false,
        });
        const w = d.workers.find((w) => w.id === booking.workerId)!;
        const rs = d.reviews.filter((r) => r.workerId === w.id);
        w.reviews = rs.length;
        w.rating = rs.reduce((sum, r) => sum + r.stars, 0) / rs.length;
      }
      return booking.id;
    }
    fail("Unknown demo action");
  }
}
export function browserDemoEnabled() {
  try {
    return typeof window !== "undefined" && localStorage.getItem("rr.browserDemo") === "true";
  } catch {
    return false;
  }
}
export function getBrowserDemo() {
  return new BrowserDemo(localStorage, sessionStorage);
}
export function enableBrowserDemo(role: "worker" | "customer") {
  localStorage.setItem("rr.browserDemo", "true");
  getBrowserDemo().quick(role);
}

export function isStandaloneDemo() {
  return (
    window.location.protocol === "file:" ||
    document.querySelector('meta[name="rr-standalone"]') !== null
  );
}

export function openDemoPath(path: string) {
  if (isStandaloneDemo()) {
    window.location.hash = path;
    window.location.reload();
  } else window.location.assign(path);
}
