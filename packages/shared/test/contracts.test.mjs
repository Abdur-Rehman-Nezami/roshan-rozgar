import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_OUTPUT_SCHEMAS,
  API_CONTRACT,
  BookingStatusSchema,
  ChangeBookingStatusSchema,
  CreateBookingSchema,
  CreateMessageSchema,
  DisplaySchema,
  EVENT_SCHEMAS,
  MediaUrlSchema,
  MoneySchema,
  PhoneSchema,
  PriceSchema,
  PROMPTS,
  PublicWorkerSchema,
  RequestCardSchema,
  RespondOfferSchema,
  SCREEN_IDS,
  SCREEN_PROMPTS,
  SCREEN_ROUTES,
  ScreenSpecSchema,
  TagCountsSchema,
  TimeRangeSchema,
  WorkerProfileInputSchema,
  WorkerProfilePatchSchema,
  validateAssistantOutput,
  validateTriageOutput,
} from "../src/index.ts";

const id = "11111111-1111-4111-8111-111111111111";
const display = { ur: "کام", roman: "Kaam", en: "Work" };
const tags = { on_time: 0, fair_price: 0, clean: 0, quality: 0, hire_again: 0, n: 0 };
const worker = {
  id,
  name: display,
  areaId: "isb-g-9",
  trades: ["plumber"],
  tasks: ["plumber.tap_repair"],
  availability: "free",
  yearsExp: 3,
  rateMin: 500,
  rateMax: 1500,
  ratingAvg: null,
  ratingCount: 0,
  jobsCompleted: 0,
  repeatCustomers: 0,
  tagCounts: tags,
  reviewSummary: null,
  photoUrl: null,
  voiceIntroUrl: null,
  isSeeded: true,
  simulated: false,
};
const profile = {
  name: display,
  yearsExp: 3,
  tradeSlugs: ["plumber"],
  taskSlugs: ["plumber.tap_repair"],
  areaIds: ["isb-g-9"],
  rateMin: 500,
  rateMax: 1000,
  serviceRadiusKm: 8,
};
const spec = {
  id: "W4",
  promptId: "q.name",
  elements: [{ id: "W4.mic", label: display }],
  actions: ["highlight", "fillField", "none"],
  fields: [
    { id: "years", type: "number" },
    { id: "trade", type: "choice", options: ["plumber"] },
  ],
};
const action = {
  say: display,
  action: "highlight",
  target: "W4.mic",
  field: null,
  value: null,
  screen: null,
  sourceIds: [],
};

test("Pakistani mobile phone inputs normalize in all supported digit scripts", () => {
  for (const value of ["0300 123-4567", "+92 300 1234567", "۰۳۰۰۱۲۳۴۵۶۷", "٠٣٠٠١٢٣٤٥٦٧"]) {
    assert.equal(PhoneSchema.parse(value), "+923001234567");
  }
  for (const value of ["123", "+13001234567", "030012345678"])
    assert.equal(PhoneSchema.safeParse(value).success, false);
});

test("booking intervals reject equal/reversed endpoints and timestamps without zones", () => {
  const start = "2026-11-10T10:00:00+05:00";
  assert.equal(TimeRangeSchema.safeParse({ start, end: start }).success, false);
  assert.equal(TimeRangeSchema.safeParse({ start, end: "2026-11-10T04:59:00Z" }).success, false);
  assert.equal(
    TimeRangeSchema.safeParse({ start: "2026-11-10T10:00:00", end: "2026-11-10T12:00:00" }).success,
    false,
  );
  assert.ok(TimeRangeSchema.parse({ start, end: "2026-11-10T06:00:00Z" }));
});

test("worker updates cannot inject server-owned flags or inverted prices", () => {
  assert.ok(WorkerProfileInputSchema.parse(profile));
  for (const extra of [
    { isSeeded: true },
    { autoRespond: true },
    { profileComplete: true },
    { rateMax: 100 },
  ]) {
    assert.equal(WorkerProfileInputSchema.safeParse({ ...profile, ...extra }).success, false);
  }
  assert.equal(WorkerProfilePatchSchema.safeParse({}).success, false);
  assert.equal(WorkerProfilePatchSchema.safeParse({ availability: "free" }).success, false);
});

test("public worker serialization fails closed on phone/address disclosure", () => {
  assert.ok(PublicWorkerSchema.parse(worker));
  for (const extra of [{ phone: "+923001234567" }, { addressDetail: "private address" }]) {
    assert.equal(PublicWorkerSchema.safeParse({ ...worker, ...extra }).success, false);
  }
});

test("incoming request cards reject precise address and customer identifiers", () => {
  const request = {
    id,
    tradeSlug: "plumber",
    taskSlug: "plumber.tap_repair",
    descriptionText: "Leaking tap",
    descriptionAudioUrl: null,
    photoUrl: null,
    urgency: "today",
    wanted: { start: "2026-11-10T05:00:00Z", end: "2026-11-10T07:00:00Z" },
    areaId: "isb-g-9",
    mode: "normal",
    status: "open",
    createdAt: "2026-11-10T04:00:00Z",
  };
  assert.ok(RequestCardSchema.parse(request));
  assert.equal(
    RequestCardSchema.safeParse({ ...request, addressDetail: "private", customerId: id }).success,
    false,
  );
});

test("prices reject decimals, negatives and inconsistent provenance statistics", () => {
  assert.equal(MoneySchema.safeParse(-1).success, false);
  assert.equal(MoneySchema.safeParse(1.5).success, false);
  const price = {
    min: 500,
    max: 1000,
    median: 750,
    n: 8,
    source: {
      id: "rate",
      kind: "completed_jobs",
      title: "8 jobs (seeded)",
      refId: "plumber.tap_repair",
      isSeeded: true,
      count: 8,
    },
  };
  assert.ok(PriceSchema.parse(price));
  assert.equal(PriceSchema.safeParse({ ...price, max: 100 }).success, false);
  assert.equal(PriceSchema.safeParse({ ...price, median: 1500 }).success, false);
  assert.equal(TagCountsSchema.safeParse({ ...tags, on_time: 5 }).success, false);
});

test("clients cannot invent agreement prices or create privileged chat messages", () => {
  assert.ok(CreateBookingSchema.parse({ threadId: id }));
  assert.equal(
    CreateBookingSchema.safeParse({ threadId: id, agreement: { priceRs: 1 } }).success,
    false,
  );
  assert.equal(CreateMessageSchema.safeParse({ kind: "system", text: "confirmed" }).success, false);
  assert.equal(
    CreateMessageSchema.safeParse({ kind: "text", text: "hello", lang: "en", senderId: id })
      .success,
    false,
  );
  assert.equal(RespondOfferSchema.safeParse({ action: "counter" }).success, false);
  assert.ok(RespondOfferSchema.parse({ action: "counter", price: 1500 }));
});

test("booking status commands require arrival code/final amount and forbid arbitrary transitions", () => {
  assert.equal(ChangeBookingStatusSchema.safeParse({ status: "confirmed" }).success, false);
  assert.equal(ChangeBookingStatusSchema.safeParse({ status: "arrived" }).success, false);
  assert.equal(ChangeBookingStatusSchema.safeParse({ status: "completed" }).success, false);
  assert.ok(ChangeBookingStatusSchema.parse({ status: "arrived", arrivalCode: "1234" }));
  assert.equal(BookingStatusSchema.safeParse("paid").success, false);
});

test("media URLs reject executable schemes, traversal and embedded credentials", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:audio/mpeg;base64,AA",
    "/uploads/../secret",
    "https://user:pass@example.com/a.mp3",
  ])
    assert.equal(MediaUrlSchema.safeParse(url).success, false);
  assert.ok(MediaUrlSchema.parse("/uploads/clip.webm"));
  assert.ok(MediaUrlSchema.parse("https://example.com/clip.mp3"));
});

test("assistant rejects unknown actions, foreign targets and unregistered fields", () => {
  assert.equal(validateAssistantOutput(action, spec).target, "W4.mic");
  for (const patch of [
    { action: "confirm" },
    { target: "C3.submit" },
    { target: "W4.delete" },
    { target: null },
  ])
    assert.throws(() => validateAssistantOutput({ ...action, ...patch }, spec));
  assert.throws(() =>
    validateAssistantOutput(
      { ...action, action: "fillField", field: "years", value: "many" },
      spec,
    ),
  );
  assert.throws(() =>
    validateAssistantOutput({ ...action, action: "fillField", field: "years", value: "" }, spec),
  );
  assert.throws(() =>
    validateAssistantOutput(
      { ...action, action: "fillField", field: "trade", value: "electrician" },
      spec,
    ),
  );
  assert.ok(
    validateAssistantOutput({ ...action, action: "fillField", field: "years", value: "5" }, spec),
  );
});

test("screen registry rejects duplicate, foreign and invalid prompt identifiers", () => {
  assert.equal(
    ScreenSpecSchema.safeParse({ ...spec, elements: [...spec.elements, ...spec.elements] }).success,
    false,
  );
  assert.equal(ScreenSpecSchema.safeParse({ ...spec, promptId: "invented" }).success, false);
  assert.equal(
    ScreenSpecSchema.safeParse({ ...spec, elements: [{ id: "C3.submit", label: display }] })
      .success,
    false,
  );
});

test("RAG triage rejects invented citations, follow-ups and unprovided tasks", () => {
  const triage = {
    trade_slug: "plumber",
    task_slug: "plumber.tap_repair",
    urgency: "today",
    summary: display,
    followUpIds: ["drip"],
    safetyTipId: "valve",
    citedDocIds: ["guide"],
  };
  const context = {
    trades: ["plumber"],
    tasks: ["plumber.tap_repair"],
    docIds: ["guide"],
    followUpIds: ["drip"],
    safetyTipIds: ["valve"],
  };
  assert.ok(validateTriageOutput(triage, context));
  for (const patch of [
    { citedDocIds: ["fabricated"] },
    { citedDocIds: [] },
    { followUpIds: ["invented"] },
    { task_slug: "plumber.drain_unblock" },
  ])
    assert.throws(() => validateTriageOutput({ ...triage, ...patch }, context));
});

test("AI agreement schema cannot return numeric prices and all display strings require three languages", () => {
  assert.equal(
    AI_OUTPUT_SCHEMAS.agreement_card.safeParse({ job: display, when_text: display, priceRs: 500 })
      .success,
    false,
  );
  assert.equal(DisplaySchema.safeParse({ ur: "کام", en: "work" }).success, false);
  assert.equal(Object.keys(AI_OUTPUT_SCHEMAS).length, 17);
});

test("all 28 screens have routes/overlay metadata and a valid three-language prompt", () => {
  assert.equal(SCREEN_IDS.length, 28);
  for (const screen of SCREEN_IDS) {
    assert.ok(Object.hasOwn(SCREEN_ROUTES, screen));
    assert.ok(DisplaySchema.parse(PROMPTS[SCREEN_PROMPTS[screen]]));
  }
  assert.equal(SCREEN_ROUTES.W8, null);
  assert.equal(Object.keys(EVENT_SCHEMAS).length, 6);
  assert.equal(Object.keys(API_CONTRACT).length, 42);
});
