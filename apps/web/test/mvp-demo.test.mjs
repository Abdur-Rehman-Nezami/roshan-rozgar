import assert from "node:assert/strict";
import test from "node:test";
import { BrowserDemo } from "../src/demo/store.ts";
function storage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}
function pair() {
  const shared = storage();
  const worker = new BrowserDemo(shared, storage());
  const customer = new BrowserDemo(shared, storage());
  worker.quick("worker");
  customer.quick("customer");
  return { shared, worker, customer };
}
function negotiate(p) {
  const { worker, customer } = p;
  const request = customer.command({
    action: "request",
    task: "plumber.tap_repair",
    description: "Kitchen tap leaks",
    areaId: "isb-g-9",
    address: "DEMO private kitchen address",
    name: "DEMO customer",
  }).id;
  const id = worker.me().user.id;
  const offer = customer.command({ action: "offer", requestId: request, workerId: id }).id;
  assert.equal(worker.state().requests[0].address, null);
  const thread = worker.command({ action: "respond", offerId: offer, accept: true }).id;
  worker.command({ action: "message", threadId: thread, text: "I can repair the tap", lang: "en" });
  const proposal = worker.command({ action: "propose", threadId: thread, price: 1200 }).id;
  customer.command({ action: "acceptPrice", threadId: thread, messageId: proposal });
  return { request, thread };
}

test("MVP golden path across independent worker/customer sessions: request through cash completion and review", () => {
  const p = pair();
  const { worker, customer } = p;
  const { thread } = negotiate(p);
  const booking = customer.command({ action: "hold", threadId: thread }).id;
  assert.equal(customer.state().bookings[0].price, 1200);
  assert.equal(worker.state().bookings[0].code, null);
  assert.equal(worker.state().bookings[0].address, null);
  customer.command({ action: "confirm", bookingId: booking });
  assert.equal(worker.state().bookings[0].status, "held");
  worker.command({ action: "confirm", bookingId: booking });
  assert.equal(worker.state().bookings[0].status, "confirmed");
  assert.equal(worker.state().requests[0].address, "DEMO private kitchen address");
  assert.equal(customer.state().workers.find((w) => w.id === worker.me().user.id).free, false);
  worker.command({ action: "status", bookingId: booking, status: "on_the_way" });
  const code = customer.state().bookings[0].code;
  assert.throws(
    () =>
      worker.command({
        action: "status",
        bookingId: booking,
        status: "arrived",
        code: code === "0000" ? "9999" : "0000",
      }),
    /Incorrect/,
  );
  worker.command({ action: "status", bookingId: booking, status: "arrived", code });
  worker.command({ action: "status", bookingId: booking, status: "in_progress" });
  worker.command({ action: "status", bookingId: booking, status: "completed", amount: 1250 });
  assert.equal(customer.state().bookings[0].status, "in_progress");
  customer.command({ action: "complete", bookingId: booking });
  assert.equal(customer.state().bookings[0].status, "completed");
  assert.equal(customer.state().workers.find((w) => w.id === worker.me().user.id).free, true);
  const review = {
    action: "review",
    bookingId: booking,
    stars: 5,
    text: "Excellent work",
    tags: { on_time: true, fair_price: true, clean: true, quality: true, hire_again: true },
  };
  customer.command(review);
  assert.equal(worker.state().reviews[0].text, "Excellent work");
  assert.equal(worker.state().workers.find((w) => w.id === worker.me().user.id).rating, 5);
  assert.throws(() => customer.command(review), /Review unavailable/);
});

test("MVP profile onboarding, role guards, one-use code and unrelated-user privacy", () => {
  const { shared, worker, customer } = pair();
  const newcomer = new BrowserDemo(shared, storage());
  const start = newcomer.start({ phone: "03001234567", role: "worker" });
  newcomer.verify({ phone: "03001234567", code: start.demoCode });
  assert.throws(() => newcomer.verify({ phone: "03001234567", code: start.demoCode }));
  newcomer.command({
    action: "profile",
    profile: {
      name: "DEMO new worker",
      years: 3,
      trades: ["plumber"],
      areas: ["isb-g-9"],
      rateMin: 500,
      rateMax: 1500,
    },
  });
  newcomer.command({ action: "availability", free: true });
  assert.equal(newcomer.state().workers.find((w) => w.id === newcomer.me().user.id).complete, true);
  assert.throws(() => customer.command({ action: "availability", free: true }), /other role/);
  negotiate({ worker, customer });
  assert.equal(newcomer.state().requests.length, 0);
  assert.equal(newcomer.state().threads.length, 0);
  assert.equal(newcomer.state().messages.length, 0);
});

test("MVP rejects self price acceptance and busy worker offers", () => {
  const p = pair();
  const { worker, customer } = p;
  const { thread } = negotiate(p);
  const proposal = worker.command({ action: "propose", threadId: thread, price: 1500 }).id;
  assert.throws(
    () => worker.command({ action: "acceptPrice", threadId: thread, messageId: proposal }),
    /other person's/,
  );
  assert.throws(() => customer.command({ action: "hold", threadId: thread }), /Agree a price/);
  customer.command({ action: "acceptPrice", threadId: thread, messageId: proposal });
  customer.command({ action: "hold", threadId: thread });
  const request = customer.command({
    action: "request",
    task: "plumber.tap_repair",
    description: "Another tap",
    areaId: "isb-g-9",
    address: "Another DEMO address",
    name: "DEMO customer",
  }).id;
  assert.throws(
    () => customer.command({ action: "offer", requestId: request, workerId: worker.me().user.id }),
    /no longer available/,
  );
});

test("MVP offer and hold expiration free the worker again", (context) => {
  context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-10T12:00:00Z").getTime() });
  try {
    const p = pair();
    const { thread } = negotiate(p);
    p.customer.command({ action: "hold", threadId: thread });
    context.mock.timers.tick(301000);
    assert.equal(p.customer.state().bookings[0].status, "expired");
    assert.equal(p.customer.state().workers.find((w) => w.id === p.worker.me().user.id).free, true);
  } finally {
    context.mock.timers.reset();
  }
});
