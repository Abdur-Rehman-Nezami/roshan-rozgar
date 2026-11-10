import { z } from "zod";
import {
  AiModeSchema,
  AreaIdSchema,
  AvailabilitySchema,
  BookingStatusSchema,
  CoordinatesSchema,
  DisplaySchema,
  IdSchema,
  JsonObjectSchema,
  LanguageSchema,
  MediaUrlSchema,
  MoneySchema,
  PhoneSchema,
  ReviewTagsSchema,
  TaskSlugSchema,
  TextSchema,
  TimeRangeSchema,
} from "./schemas.ts";
import {
  AgreementSchema,
  AiCallSchema,
  BookingSchema,
  MatchSchema,
  MessageSchema,
  OfferSchema,
  PriceSchema,
  PublicWorkerSchema,
  RequestSchema,
  ReviewSchema,
  SourceSchema,
  ThreadSchema,
  UserSchema,
  WorkerPhotoSchema,
  WorkerSchema,
} from "./entities.ts";
import { ActionNameSchema, ElementIdSchema, ScreenIdSchema } from "./screens.ts";
import {
  AI_OUTPUT_SCHEMAS,
  AssistantOutputSchema,
  ReviewExtractionSchema,
  TriageOutputSchema,
} from "./ai.ts";
import { WorkerProfileInputSchema } from "./profile.ts";

export const OtpStartSchema = z
  .object({ phone: PhoneSchema, role: z.enum(["worker", "customer"]) })
  .strict();
export const OtpVerifySchema = z
  .object({ phone: PhoneSchema, code: z.string().regex(/^\d{6}$/) })
  .strict();
export const AssistantTurnSchema = z
  .object({
    screenId: ScreenIdSchema,
    role: z.enum(["worker", "customer"]),
    lang: LanguageSchema,
    transcript: TextSchema,
    allowedActions: z.array(ActionNameSchema),
    elements: z.array(z.object({ id: ElementIdSchema, label: DisplaySchema }).strict()),
    state: JsonObjectSchema,
  })
  .strict();
export const TriageInputSchema = z
  .object({
    text: TextSchema.optional(),
    audioUrl: MediaUrlSchema.optional(),
    photoUrl: MediaUrlSchema.optional(),
    lang: LanguageSchema,
  })
  .strict()
  .refine(
    (input) => Boolean(input.text || input.audioUrl || input.photoUrl),
    "Provide text, audio or a photo",
  );
export const TriageResponseSchema = z
  .object({
    triage: TriageOutputSchema,
    price: PriceSchema,
    safetyTip: DisplaySchema,
    followUps: z.array(
      z
        .object({
          id: z.string(),
          question: DisplaySchema,
          options: z.array(z.object({ id: z.string(), label: DisplaySchema }).strict()),
        })
        .strict(),
    ),
    sources: z.array(SourceSchema),
  })
  .strict();
export const CreateRequestSchema = z
  .object({
    triage: TriageOutputSchema,
    answers: JsonObjectSchema,
    areaId: AreaIdSchema.optional(),
    coordinates: CoordinatesSchema.optional(),
    when: TimeRangeSchema,
    mode: z.enum(["normal", "emergency"]),
    addressDetail: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (request) => request.areaId !== undefined || request.coordinates !== undefined,
    "Choose an area or location",
  );
export const RespondOfferSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }).strict(),
  z.object({ action: z.literal("decline") }).strict(),
  z.object({ action: z.literal("counter"), price: MoneySchema }).strict(),
]);
// User messages cannot impersonate system/agreement messages or select senderId.
export const CreateMessageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: TextSchema, lang: LanguageSchema }).strict(),
  z
    .object({
      kind: z.literal("voice"),
      audioUrl: MediaUrlSchema,
      text: TextSchema.optional(),
      lang: LanguageSchema,
    })
    .strict(),
  z.object({ kind: z.literal("price_proposal"), price: MoneySchema }).strict(),
  z.object({ kind: z.literal("price_accept"), proposalId: IdSchema }).strict(),
]);
// Client cannot supply an agreement price; it is reconstructed from thread state.
export const CreateBookingSchema = z.object({ threadId: IdSchema }).strict();
export const ChangeBookingStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("on_the_way") }).strict(),
  z.object({ status: z.literal("arrived"), arrivalCode: z.string().regex(/^\d{4}$/) }).strict(),
  z.object({ status: z.literal("in_progress") }).strict(),
  z.object({ status: z.literal("completed"), finalAmount: MoneySchema }).strict(),
]);
export const PostReviewSchema = z
  .object({
    stars: z.number().int().min(1).max(5),
    tags: ReviewTagsSchema,
    summary: DisplaySchema,
    transcript: z.string().max(4000),
    audioUrl: MediaUrlSchema.optional(),
    photoUrl: MediaUrlSchema.optional(),
  })
  .strict();
export const ReadinessSchema = z
  .object({
    ok: z.boolean(),
    database: z.enum(["ok", "unavailable"]),
    redis: z.enum(["ok", "unavailable"]),
    aiMode: AiModeSchema,
  })
  .strict();
const EmptySchema = z.object({}).strict();
const BookingResponse = z.object({ booking: BookingSchema }).strict();
const TranscriptInput = z.object({ transcript: TextSchema }).strict();
const PriceInput = z
  .object({
    taskText: TextSchema.optional(),
    taskSlug: TaskSlugSchema.optional(),
    city: z.string().min(1),
  })
  .strict()
  .refine((input) => Boolean(input.taskText || input.taskSlug), "Provide a task");
export const API_CONTRACT = {
  otpStart: {
    method: "POST",
    path: "/api/auth/otp/start",
    body: OtpStartSchema,
    response: z.object({ demoCode: z.string().regex(/^\d{6}$/), demo: z.literal(true) }).strict(),
  },
  otpVerify: {
    method: "POST",
    path: "/api/auth/otp/verify",
    body: OtpVerifySchema,
    response: z.object({ user: UserSchema }).strict(),
  },
  me: {
    method: "GET",
    path: "/api/me",
    response: z.object({ user: UserSchema, worker: WorkerSchema.optional() }).strict(),
  },
  stt: {
    method: "POST",
    path: "/api/voice/stt",
    upload: "audio",
    response: z
      .object({ text: z.string(), lang: LanguageSchema, ms: z.number().nonnegative() })
      .strict(),
  },
  tts: {
    method: "GET",
    path: "/api/tts",
    query: z
      .object({
        text: TextSchema,
        lang: LanguageSchema,
        rate: z.coerce.number().min(0.5).max(2).default(1),
      })
      .strict(),
    responseType: "audio/mpeg",
  },
  assistantTurn: {
    method: "POST",
    path: "/api/assistant/turn",
    body: AssistantTurnSchema,
    response: AssistantOutputSchema,
  },
  onboardingExtract: {
    method: "POST",
    path: "/api/onboarding/extract",
    body: z
      .object({
        question: z.enum(["name", "years", "jobs", "areas", "rate"]),
        transcript: TextSchema,
        lang: LanguageSchema,
      })
      .strict(),
    response: z.union([
      AI_OUTPUT_SCHEMAS.extract_name,
      AI_OUTPUT_SCHEMAS.extract_years,
      AI_OUTPUT_SCHEMAS.extract_jobs,
      AI_OUTPUT_SCHEMAS.extract_areas,
      AI_OUTPUT_SCHEMAS.extract_rate,
    ]),
  },
  onboardingCorrect: {
    method: "POST",
    path: "/api/onboarding/correct",
    body: z.object({ profile: WorkerProfileInputSchema, transcript: TextSchema }).strict(),
    response: AI_OUTPUT_SCHEMAS.apply_correction,
  },
  workerProfile: {
    method: "PUT",
    path: "/api/workers/me/profile",
    body: WorkerProfileInputSchema,
    response: z.object({ worker: WorkerSchema }).strict(),
  },
  workerPhotos: {
    method: "POST",
    path: "/api/workers/me/photos",
    upload: "image",
    response: z.object({ photo: WorkerPhotoSchema }).strict(),
  },
  workerVoiceIntro: {
    method: "POST",
    path: "/api/workers/me/voice-intro",
    upload: "audio",
    response: z.object({ url: MediaUrlSchema }).strict(),
  },
  workerAvailability: {
    method: "PUT",
    path: "/api/workers/me/availability",
    body: z.object({ availability: AvailabilitySchema }).strict(),
    response: z.object({ worker: WorkerSchema }).strict(),
  },
  parseSlots: {
    method: "POST",
    path: "/api/workers/me/slots/parse",
    body: TranscriptInput,
    response: AI_OUTPUT_SCHEMAS.parse_availability,
  },
  workerSlots: {
    method: "PUT",
    path: "/api/workers/me/slots",
    body: z.object({ slots: z.array(TimeRangeSchema).max(30) }).strict(),
    response: z.object({ slots: z.array(TimeRangeSchema) }).strict(),
  },
  publicWorker: {
    method: "GET",
    path: "/api/workers/:id",
    response: z.object({ worker: PublicWorkerSchema, reviews: z.array(ReviewSchema) }).strict(),
  },
  triage: {
    method: "POST",
    path: "/api/requests/triage",
    body: TriageInputSchema,
    response: TriageResponseSchema,
  },
  createRequest: {
    method: "POST",
    path: "/api/requests",
    body: CreateRequestSchema,
    response: z.object({ request: RequestSchema }).strict(),
  },
  matches: {
    method: "GET",
    path: "/api/requests/:id/matches",
    response: z
      .object({ workers: z.array(MatchSchema), price: PriceSchema, sources: z.array(SourceSchema) })
      .strict(),
  },
  createOffer: {
    method: "POST",
    path: "/api/requests/:id/offers",
    body: z.object({ workerId: IdSchema }).strict(),
    response: z.object({ offer: OfferSchema }).strict(),
  },
  respondOffer: {
    method: "POST",
    path: "/api/offers/:id/respond",
    body: RespondOfferSchema,
    response: z.object({ offer: OfferSchema, threadId: IdSchema.optional() }).strict(),
  },
  thread: {
    method: "GET",
    path: "/api/threads/:id",
    response: z.object({ thread: ThreadSchema, messages: z.array(MessageSchema) }).strict(),
  },
  createMessage: {
    method: "POST",
    path: "/api/threads/:id/messages",
    body: CreateMessageSchema,
    response: z.object({ message: MessageSchema }).strict(),
  },
  agreement: {
    method: "POST",
    path: "/api/threads/:id/agreement",
    body: EmptySchema,
    response: z.object({ agreement: AgreementSchema }).strict(),
  },
  createBooking: {
    method: "POST",
    path: "/api/bookings",
    body: CreateBookingSchema,
    response: BookingResponse,
  },
  confirmBooking: {
    method: "POST",
    path: "/api/bookings/:id/confirm",
    body: EmptySchema,
    response: BookingResponse,
  },
  bookingStatus: {
    method: "POST",
    path: "/api/bookings/:id/status",
    body: ChangeBookingStatusSchema,
    response: BookingResponse,
  },
  cancelBooking: {
    method: "POST",
    path: "/api/bookings/:id/cancel",
    body: z.object({ reason: TextSchema }).strict(),
    response: BookingResponse,
  },
  extractReview: {
    method: "POST",
    path: "/api/bookings/:id/review/extract",
    body: z.object({ transcript: TextSchema, ticks: ReviewTagsSchema }).strict(),
    response: ReviewExtractionSchema,
  },
  postReview: {
    method: "POST",
    path: "/api/bookings/:id/review",
    body: PostReviewSchema,
    response: z.object({ review: ReviewSchema }).strict(),
  },
  myBookings: {
    method: "GET",
    path: "/api/me/bookings",
    response: z.object({ upcoming: z.array(BookingSchema), past: z.array(BookingSchema) }).strict(),
  },
  earnings: {
    method: "GET",
    path: "/api/me/earnings",
    response: z
      .object({ today: MoneySchema, week: MoneySchema, recentJobs: z.array(BookingSchema) })
      .strict(),
  },
  price: { method: "POST", path: "/api/rag/price", body: PriceInput, response: PriceSchema },
  demoAiMode: {
    method: "POST",
    path: "/api/demo/ai-mode",
    body: z.object({ mode: AiModeSchema }).strict(),
    response: z.object({ mode: AiModeSchema }).strict(),
  },
  demoReset: {
    method: "POST",
    path: "/api/demo/reset",
    body: EmptySchema,
    response: z.object({ ok: z.literal(true) }).strict(),
  },
  demoSimulate: {
    method: "POST",
    path: "/api/demo/simulate-request",
    body: z.object({ workerId: IdSchema }).strict(),
    response: z.object({ offer: OfferSchema }).strict(),
  },
  demoAvailability: {
    method: "POST",
    path: "/api/demo/flip-availability",
    body: z.object({ workerId: IdSchema }).strict(),
    response: z.object({ worker: WorkerSchema }).strict(),
  },
  demoAutoRespond: {
    method: "POST",
    path: "/api/demo/auto-respond",
    body: z.object({ enabled: z.boolean() }).strict(),
    response: z.object({ enabled: z.boolean() }).strict(),
  },
  demoAiLog: {
    method: "GET",
    path: "/api/demo/ai-log",
    response: z.object({ calls: z.array(AiCallSchema) }).strict(),
  },
  demoSeeded: {
    method: "GET",
    path: "/api/demo/seeded",
    response: z.object({ seeded: z.array(z.string()), mocked: z.array(z.string()) }).strict(),
  },
  demoRace: {
    method: "POST",
    path: "/api/demo/race-test",
    body: z.object({ workerId: IdSchema, threadIds: z.tuple([IdSchema, IdSchema]) }).strict(),
    response: z
      .object({
        results: z
          .array(z.object({ status: z.number().int(), code: z.string().nullable() }).strict())
          .length(2),
      })
      .strict(),
  },
  health: {
    method: "GET",
    path: "/healthz",
    response: z.object({ ok: z.literal(true) }).passthrough(),
  },
  ready: { method: "GET", path: "/readyz", response: ReadinessSchema },
} as const;
export type ApiName = keyof typeof API_CONTRACT;
export type ApiRequest<N extends ApiName> = (typeof API_CONTRACT)[N] extends {
  body: infer S extends z.ZodTypeAny;
}
  ? z.input<S>
  : never;
export type ApiResponse<N extends ApiName> = (typeof API_CONTRACT)[N] extends {
  response: infer S extends z.ZodTypeAny;
}
  ? z.output<S>
  : never;
export const BookingStatusFilterSchema = BookingStatusSchema;
