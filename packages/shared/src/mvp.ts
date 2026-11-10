import { z } from "zod";
import {
  AreaIdSchema,
  IdSchema,
  MoneySchema,
  TradeSchema,
  LanguageSchema,
  ReviewTagsSchema,
  BookingStatusSchema,
} from "./schemas.ts";

export const MVP_AREAS = [
  {
    id: "isb-g-9",
    city: "islamabad",
    lat: 33.688,
    lng: 73.032,
    label: { ur: "جی نائن، اسلام آباد", roman: "G-9 Islamabad", en: "G-9, Islamabad" },
  },
  {
    id: "isb-g-10",
    city: "islamabad",
    lat: 33.676,
    lng: 73.012,
    label: { ur: "جی ٹین، اسلام آباد", roman: "G-10 Islamabad", en: "G-10, Islamabad" },
  },
  {
    id: "isb-f-10",
    city: "islamabad",
    lat: 33.696,
    lng: 73.013,
    label: { ur: "ایف ٹین، اسلام آباد", roman: "F-10 Islamabad", en: "F-10, Islamabad" },
  },
  {
    id: "rwp-satellite-town",
    city: "rawalpindi",
    lat: 33.635,
    lng: 73.064,
    label: {
      ur: "سیٹلائٹ ٹاؤن، راولپنڈی",
      roman: "Satellite Town Rawalpindi",
      en: "Satellite Town, Rawalpindi",
    },
  },
] as const;
export const MVP_TASKS = [
  {
    id: "plumber.tap_repair",
    trade: "plumber",
    min: 500,
    max: 1500,
    minutes: 60,
    icon: "🚰",
    label: { ur: "نل یا پانی کا رساؤ", roman: "Nal ya pani ka risao", en: "Leaking tap or pipe" },
  },
  {
    id: "electrician.wiring_repair",
    trade: "electrician",
    min: 800,
    max: 2500,
    minutes: 90,
    icon: "⚡",
    label: {
      ur: "بجلی یا سوئچ کی مرمت",
      roman: "Bijli ya switch ki marammat",
      en: "Wiring or switch repair",
    },
  },
  {
    id: "ac_technician.ac_service",
    trade: "ac_technician",
    min: 2000,
    max: 4500,
    minutes: 120,
    icon: "❄",
    label: { ur: "اے سی کی سروس", roman: "AC ki service", en: "AC service" },
  },
  {
    id: "carpenter.door_repair",
    trade: "carpenter",
    min: 1000,
    max: 3000,
    minutes: 120,
    icon: "🪚",
    label: {
      ur: "دروازے یا فرنیچر کی مرمت",
      roman: "Darwaze ya furniture ki marammat",
      en: "Door or furniture repair",
    },
  },
  {
    id: "mechanic.bike_service",
    trade: "mechanic",
    min: 700,
    max: 2000,
    minutes: 90,
    icon: "🔧",
    label: { ur: "موٹر سائیکل کی سروس", roman: "Motorcycle ki service", en: "Motorcycle service" },
  },
  {
    id: "painter.room_paint",
    trade: "painter",
    min: 5000,
    max: 12000,
    minutes: 120,
    icon: "🎨",
    label: { ur: "کمرے کا رنگ", roman: "Kamre ka rang", en: "Room painting" },
  },
  {
    id: "mason.wall_repair",
    trade: "mason",
    min: 1500,
    max: 5000,
    minutes: 120,
    icon: "🧱",
    label: { ur: "دیوار کی مرمت", roman: "Deewar ki marammat", en: "Wall repair" },
  },
  {
    id: "other.general_help",
    trade: "other",
    min: 500,
    max: 2000,
    minutes: 120,
    icon: "🛠",
    label: { ur: "دیگر گھریلو کام", roman: "Doosre gharelu kaam", en: "Other household work" },
  },
] as const;
export const MvpProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    years: z.number().int().min(0).max(80),
    trades: z.array(TradeSchema).min(1).max(8),
    areas: z.array(AreaIdSchema).min(1).max(20),
    rateMin: MoneySchema,
    rateMax: MoneySchema,
  })
  .refine((p) => p.rateMax >= p.rateMin, "Check your price range");
export const MvpCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("profile"), profile: MvpProfileSchema }),
  z.object({ action: z.literal("availability"), free: z.boolean() }),
  z.object({
    action: z.literal("request"),
    task: z.string().max(100),
    description: z.string().trim().min(3).max(2000),
    areaId: AreaIdSchema,
    address: z.string().trim().min(3).max(1000),
    when: z.string().datetime({ offset: true }).optional(),
    name: z.string().trim().min(1).max(100),
  }),
  z.object({ action: z.literal("offer"), requestId: IdSchema, workerId: IdSchema }),
  z.object({ action: z.literal("respond"), offerId: IdSchema, accept: z.boolean() }),
  z.object({
    action: z.literal("message"),
    threadId: IdSchema,
    text: z.string().trim().min(1).max(2000),
    lang: LanguageSchema,
  }),
  z.object({ action: z.literal("propose"), threadId: IdSchema, price: MoneySchema }),
  z.object({ action: z.literal("acceptPrice"), threadId: IdSchema, messageId: IdSchema }),
  z.object({ action: z.literal("hold"), threadId: IdSchema }),
  z.object({ action: z.literal("confirm"), bookingId: IdSchema }),
  z.object({
    action: z.literal("status"),
    bookingId: IdSchema,
    status: z.enum(["on_the_way", "arrived", "in_progress", "completed"]),
    code: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
    amount: MoneySchema.optional(),
  }),
  z.object({ action: z.literal("complete"), bookingId: IdSchema }),
  z.object({
    action: z.literal("cancel"),
    bookingId: IdSchema,
    reason: z.string().trim().min(1).max(300),
  }),
  z.object({
    action: z.literal("review"),
    bookingId: IdSchema,
    stars: z.number().int().min(1).max(5),
    text: z.string().trim().min(1).max(2000),
    tags: ReviewTagsSchema,
  }),
]);
export type MvpCommand = z.infer<typeof MvpCommandSchema>;
export const MvpWorkerSchema = z.object({
  id: IdSchema,
  name: z.string(),
  years: z.number().nullable(),
  rateMin: z.number().nullable(),
  rateMax: z.number().nullable(),
  free: z.boolean(),
  complete: z.boolean(),
  trades: z.array(z.string()),
  areas: z.array(z.string()),
  rating: z.number().nullable(),
  reviews: z.number(),
  jobs: z.number(),
  seeded: z.boolean(),
  summary: z.string().nullable(),
  km: z.number().nullable(),
});
export const MvpRequestSchema = z.object({
  id: IdSchema,
  task: z.string(),
  trade: z.string(),
  description: z.string(),
  areaId: z.string(),
  start: z.string(),
  end: z.string(),
  status: z.string(),
  address: z.string().nullable(),
});
export const MvpOfferSchema = z.object({
  id: IdSchema,
  requestId: IdSchema,
  workerId: IdSchema,
  status: z.string(),
  expiresAt: z.string(),
  threadId: IdSchema.nullable(),
});
export const MvpThreadSchema = z.object({
  id: IdSchema,
  requestId: IdSchema,
  workerId: IdSchema,
  customerId: IdSchema,
  workerName: z.string(),
  customerName: z.string(),
});
export const MvpMessageSchema = z.object({
  id: IdSchema,
  threadId: IdSchema,
  senderId: IdSchema,
  kind: z.string(),
  text: z.string().nullable(),
  price: z.number().nullable(),
  createdAt: z.string(),
});
export const MvpBookingSchema = z.object({
  id: IdSchema,
  threadId: IdSchema,
  requestId: IdSchema,
  workerId: IdSchema,
  customerId: IdSchema,
  status: BookingStatusSchema,
  price: z.number(),
  finalAmount: z.number().nullable(),
  expiresAt: z.string().nullable(),
  customerConfirmed: z.boolean(),
  workerConfirmed: z.boolean(),
  code: z.string().nullable(),
  address: z.string().nullable(),
  reviewed: z.boolean(),
});
export const MvpStateSchema = z.object({
  rates: z.array(
    z.object({ task: z.string(), min: z.number(), max: z.number(), seeded: z.boolean() }),
  ),
  workers: z.array(MvpWorkerSchema),
  requests: z.array(MvpRequestSchema),
  offers: z.array(MvpOfferSchema),
  threads: z.array(MvpThreadSchema),
  messages: z.array(MvpMessageSchema),
  bookings: z.array(MvpBookingSchema),
  reviews: z.array(
    z.object({
      id: IdSchema,
      workerId: IdSchema,
      stars: z.number(),
      text: z.string(),
      seeded: z.boolean(),
    }),
  ),
});
export type MvpState = z.infer<typeof MvpStateSchema>;
export type MvpWorker = z.infer<typeof MvpWorkerSchema>;
export type MvpBooking = z.infer<typeof MvpBookingSchema>;
