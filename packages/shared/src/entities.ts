import { z } from "zod";
import {
  AreaIdSchema,
  AvailabilitySchema,
  BookingStatusSchema,
  CoordinatesSchema,
  DisplaySchema,
  IdSchema,
  JsonObjectSchema,
  KbKindSchema,
  LanguageSchema,
  MediaUrlSchema,
  MessageKindSchema,
  MoneySchema,
  OfferStatusSchema,
  PhoneSchema,
  ReviewSummarySchema,
  ReviewTagsSchema,
  RoleSchema,
  TagCountsSchema,
  TaskSlugSchema,
  TextSchema,
  TimeRangeSchema,
  TimestampSchema,
  TradeSchema,
  UrgencySchema,
} from "./schemas.ts";

export const AreaSchema = z
  .object({
    id: AreaIdSchema,
    city: z.enum(["islamabad", "rawalpindi"]),
    name: DisplaySchema,
    coordinates: CoordinatesSchema,
    isSeeded: z.boolean(),
  })
  .strict();
export const TradeEntitySchema = z
  .object({
    slug: TradeSchema,
    name: DisplaySchema,
    photo: MediaUrlSchema.nullable(),
    icon: z.string(),
    isSeeded: z.boolean(),
  })
  .strict();
export const UserSchema = z
  .object({
    id: IdSchema,
    role: RoleSchema,
    phone: PhoneSchema,
    name: DisplaySchema.nullable(),
    lang: LanguageSchema,
    areaId: AreaIdSchema.nullable(),
    coordinates: CoordinatesSchema.nullable(),
    isSeeded: z.boolean(),
    createdAt: TimestampSchema,
  })
  .strict();
export const WorkerSchema = z
  .object({
    userId: IdSchema,
    yearsExp: z.number().int().min(0).max(80).nullable(),
    rateMin: MoneySchema.nullable(),
    rateMax: MoneySchema.nullable(),
    serviceRadiusKm: z.number().positive().max(100),
    availability: AvailabilitySchema,
    availabilityUpdatedAt: TimestampSchema,
    photoUrl: MediaUrlSchema.nullable(),
    voiceIntroUrl: MediaUrlSchema.nullable(),
    profileText: z.string().nullable(),
    profileComplete: z.boolean(),
    autoRespond: z.boolean(),
    ratingAvg: z.number().min(1).max(5).nullable(),
    ratingCount: z.number().int().nonnegative(),
    jobsCompleted: z.number().int().nonnegative(),
    repeatCustomers: z.number().int().nonnegative(),
    tagCounts: TagCountsSchema,
    reviewSummary: ReviewSummarySchema.nullable(),
  })
  .strict();
export const WorkerTradeSchema = z.object({ workerId: IdSchema, tradeSlug: TradeSchema }).strict();
export const WorkerTaskSchema = z.object({ workerId: IdSchema, taskSlug: TaskSlugSchema }).strict();
export const WorkerAreaSchema = z.object({ workerId: IdSchema, areaId: AreaIdSchema }).strict();
export const WorkerSlotSchema = z
  .object({
    id: IdSchema,
    workerId: IdSchema,
    slot: TimeRangeSchema,
    source: z.enum(["voice", "tap"]),
  })
  .strict();
export const WorkerPhotoSchema = z
  .object({
    id: IdSchema,
    workerId: IdSchema,
    url: MediaUrlSchema,
    kind: z.enum(["face", "work"]),
    aiTags: z.array(TaskSlugSchema),
    caption: DisplaySchema.nullable(),
  })
  .strict();
export const RateCardSchema = z
  .object({
    taskSlug: TaskSlugSchema,
    tradeSlug: TradeSchema,
    name: DisplaySchema,
    priceMin: MoneySchema,
    priceMax: MoneySchema,
    typicalMinutes: z.number().int().positive(),
    isSeeded: z.boolean(),
  })
  .strict()
  .refine((rate) => rate.priceMax >= rate.priceMin, {
    message: "Invalid price range",
    path: ["priceMax"],
  });
export const RequestSchema = z
  .object({
    id: IdSchema,
    customerId: IdSchema,
    tradeSlug: TradeSchema,
    taskSlug: TaskSlugSchema.nullable(),
    descriptionText: z.string().nullable(),
    descriptionAudioUrl: MediaUrlSchema.nullable(),
    photoUrl: MediaUrlSchema.nullable(),
    triage: JsonObjectSchema.nullable(),
    answers: JsonObjectSchema,
    urgency: UrgencySchema,
    wanted: TimeRangeSchema,
    areaId: AreaIdSchema,
    coordinates: CoordinatesSchema.nullable(),
    addressDetail: z.string().max(1000).nullable(),
    mode: z.enum(["normal", "emergency"]),
    status: z.enum(["open", "matched", "cancelled", "expired"]),
    createdAt: TimestampSchema,
  })
  .strict();
// Worker-facing request cards intentionally have no customerId/address/phone.
export const RequestCardSchema = RequestSchema.pick({
  id: true,
  tradeSlug: true,
  taskSlug: true,
  descriptionText: true,
  descriptionAudioUrl: true,
  photoUrl: true,
  urgency: true,
  wanted: true,
  areaId: true,
  mode: true,
  status: true,
  createdAt: true,
}).strict();
export const OfferSchema = z
  .object({
    id: IdSchema,
    requestId: IdSchema,
    workerId: IdSchema,
    rank: z.number().int().positive(),
    status: OfferStatusSchema,
    counterPrice: MoneySchema.nullable(),
    expiresAt: TimestampSchema,
    createdAt: TimestampSchema,
  })
  .strict();
export const ThreadSchema = z
  .object({
    id: IdSchema,
    requestId: IdSchema,
    offerId: IdSchema,
    customerId: IdSchema,
    workerId: IdSchema,
    createdAt: TimestampSchema,
  })
  .strict();
export const MessageSchema = z
  .object({
    id: IdSchema,
    threadId: IdSchema,
    senderId: IdSchema.nullable(),
    kind: MessageKindSchema,
    text: z.string().nullable(),
    audioUrl: MediaUrlSchema.nullable(),
    lang: LanguageSchema.nullable(),
    translations: DisplaySchema.nullable(),
    price: MoneySchema.nullable(),
    payload: JsonObjectSchema.nullable(),
    createdAt: TimestampSchema,
  })
  .strict();
export const AgreementSchema = z
  .object({ job: DisplaySchema, priceRs: MoneySchema, when: TimeRangeSchema, area: AreaIdSchema })
  .strict();
export const BookingSchema = z
  .object({
    id: IdSchema,
    requestId: IdSchema,
    threadId: IdSchema,
    customerId: IdSchema,
    workerId: IdSchema,
    tradeSlug: TradeSchema,
    taskSlug: TaskSlugSchema.nullable(),
    city: z.string(),
    areaId: AreaIdSchema,
    slot: TimeRangeSchema,
    status: BookingStatusSchema,
    holdExpiresAt: TimestampSchema.nullable(),
    agreedPrice: MoneySchema,
    finalAmount: MoneySchema.nullable(),
    agreement: AgreementSchema,
    customerConfirmedAt: TimestampSchema.nullable(),
    workerConfirmedAt: TimestampSchema.nullable(),
    arrivalCode: z
      .string()
      .regex(/^\d{4}$/)
      .nullable(),
    completedAt: TimestampSchema.nullable(),
    isSeeded: z.boolean(),
    createdAt: TimestampSchema,
  })
  .strict();
export const ReviewSchema = z
  .object({
    id: IdSchema,
    bookingId: IdSchema,
    customerId: IdSchema,
    workerId: IdSchema,
    stars: z.number().int().min(1).max(5),
    tags: ReviewTagsSchema,
    transcript: z.string().max(4000).nullable(),
    audioUrl: MediaUrlSchema.nullable(),
    photoUrl: MediaUrlSchema.nullable(),
    summary: DisplaySchema.nullable(),
    isSeeded: z.boolean(),
    createdAt: TimestampSchema,
  })
  .strict();
export const KbDocSchema = z
  .object({
    id: IdSchema,
    kind: KbKindSchema,
    refId: z.string(),
    screenId: z.string().nullable(),
    title: z.string(),
    body: z.string(),
    searchText: z.string(),
    meta: JsonObjectSchema,
    embedding: z.array(z.number().finite()).length(1536).nullable(),
    isSeeded: z.boolean(),
  })
  .strict();
export const AiCallSchema = z
  .object({
    id: z.string(),
    route: z.string(),
    provider: z.string(),
    model: z.string(),
    effort: z.enum(["low", "medium", "high"]).nullable(),
    latencyMs: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    cacheReadTokens: z.number().int().nonnegative().nullable(),
    ok: z.boolean(),
    errorCode: z.string().nullable(),
    cached: z.boolean(),
    createdAt: TimestampSchema,
  })
  .strict();

export const PublicWorkerSchema = z
  .object({
    id: IdSchema,
    name: DisplaySchema,
    areaId: AreaIdSchema,
    trades: z.array(TradeSchema),
    tasks: z.array(TaskSlugSchema),
    availability: AvailabilitySchema,
    yearsExp: z.number().int().nonnegative(),
    rateMin: MoneySchema,
    rateMax: MoneySchema,
    ratingAvg: z.number().min(1).max(5).nullable(),
    ratingCount: z.number().int().nonnegative(),
    jobsCompleted: z.number().int().nonnegative(),
    repeatCustomers: z.number().int().nonnegative(),
    tagCounts: TagCountsSchema,
    reviewSummary: ReviewSummarySchema.nullable(),
    photoUrl: MediaUrlSchema.nullable(),
    voiceIntroUrl: MediaUrlSchema.nullable(),
    isSeeded: z.boolean(),
    simulated: z.boolean(),
  })
  .strict();
export const SourceSchema = z
  .object({
    id: z.string(),
    kind: z.enum([
      "rate_card",
      "problem_guide",
      "help",
      "glossary",
      "worker_profile",
      "review_summary",
      "completed_jobs",
    ]),
    title: TextSchema,
    refId: z.string(),
    isSeeded: z.boolean(),
    count: z.number().int().nonnegative().optional(),
  })
  .strict();
export const PriceSchema = z
  .object({
    min: MoneySchema,
    max: MoneySchema,
    median: MoneySchema.nullable(),
    n: z.number().int().nonnegative(),
    source: SourceSchema,
  })
  .strict()
  .refine(
    (price) =>
      price.max >= price.min &&
      (price.median === null || (price.median >= price.min && price.median <= price.max)),
    { message: "Invalid price statistics" },
  );
export const MatchSchema = z
  .object({
    worker: PublicWorkerSchema,
    score: z.number().min(0).max(1),
    reasons: z.array(TextSchema),
    km: z.number().nonnegative(),
    etaMin: z.number().int().nonnegative(),
    etaIsEstimate: z.literal(true),
  })
  .strict();

export type User = z.infer<typeof UserSchema>;
export type Worker = z.infer<typeof WorkerSchema>;
export type PublicWorker = z.infer<typeof PublicWorkerSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type Offer = z.infer<typeof OfferSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Price = z.infer<typeof PriceSchema>;

export type Area = z.infer<typeof AreaSchema>;
export type TradeEntity = z.infer<typeof TradeEntitySchema>;
export type WorkerTrade = z.infer<typeof WorkerTradeSchema>;
export type WorkerTask = z.infer<typeof WorkerTaskSchema>;
export type WorkerArea = z.infer<typeof WorkerAreaSchema>;
export type WorkerSlot = z.infer<typeof WorkerSlotSchema>;
export type WorkerPhoto = z.infer<typeof WorkerPhotoSchema>;
export type RateCard = z.infer<typeof RateCardSchema>;
export type Request = z.infer<typeof RequestSchema>;
export type RequestCard = z.infer<typeof RequestCardSchema>;
export type Thread = z.infer<typeof ThreadSchema>;
export type Agreement = z.infer<typeof AgreementSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type KbDoc = z.infer<typeof KbDocSchema>;
export type AiCall = z.infer<typeof AiCallSchema>;
export type Match = z.infer<typeof MatchSchema>;
