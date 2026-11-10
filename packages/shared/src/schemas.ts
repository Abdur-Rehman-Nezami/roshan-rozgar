import { z } from "zod";
import { AI_MODES, LANGUAGES } from "./constants.ts";

export const LanguageSchema = z.enum(LANGUAGES);
export const AiModeSchema = z.enum(AI_MODES);
export const RoleSchema = z.enum(["worker", "customer", "admin"]);
export const DisplaySchema = z
  .object({ ur: z.string(), roman: z.string(), en: z.string() })
  .strict();
export type Display = z.infer<typeof DisplaySchema>;
export const IdSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime({ offset: true });
export const MoneySchema = z.number().int().nonnegative().max(100_000_000);
export const TextSchema = z.string().trim().min(1).max(4000);
export const AreaIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
export const TradeSchema = z.enum([
  "plumber",
  "electrician",
  "ac_technician",
  "carpenter",
  "mechanic",
  "painter",
  "mason",
  "other",
]);
export const TaskSlugSchema = z
  .string()
  .regex(/^[a-z_]+\.[a-z0-9_]+$/)
  .max(100);
export const AvailabilitySchema = z.enum(["free", "off"]);
export const UrgencySchema = z.enum(["emergency", "today", "scheduled"]);
export const OfferStatusSchema = z.enum([
  "pending",
  "accepted",
  "countered",
  "declined",
  "expired",
  "withdrawn",
]);
export const BookingStatusSchema = z.enum([
  "held",
  "confirmed",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
]);
export const MessageKindSchema = z.enum([
  "text",
  "voice",
  "price_proposal",
  "price_accept",
  "system",
  "agreement",
]);
export const KbKindSchema = z.enum([
  "rate_card",
  "problem_guide",
  "help",
  "glossary",
  "worker_profile",
  "review_summary",
]);
export const CoordinatesSchema = z
  .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
  .strict();
export const TimeRangeSchema = z
  .object({ start: TimestampSchema, end: TimestampSchema })
  .strict()
  .refine((value) => Date.parse(value.end) > Date.parse(value.start), {
    message: "End must be after start",
    path: ["end"],
  });
export const PhoneSchema = z
  .string()
  .trim()
  .transform((input) =>
    input
      .replace(/[۰-۹٠-٩]/g, (digit) =>
        String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
      )
      .replace(/[\s()-]/g, ""),
  )
  .refine((phone) => /^(?:\+92|0)3\d{9}$/.test(phone), "Enter a Pakistani mobile number")
  .transform((phone) => (phone.startsWith("0") ? `+92${phone.slice(1)}` : phone));
export const ReviewTagsSchema = z
  .object({
    on_time: z.boolean(),
    fair_price: z.boolean(),
    clean: z.boolean(),
    quality: z.boolean(),
    hire_again: z.boolean(),
  })
  .strict();
export const TagCountsSchema = z
  .object({
    on_time: z.number().int().nonnegative(),
    fair_price: z.number().int().nonnegative(),
    clean: z.number().int().nonnegative(),
    quality: z.number().int().nonnegative(),
    hire_again: z.number().int().nonnegative(),
    n: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (counts) => Object.entries(counts).every(([key, count]) => key === "n" || count <= counts.n),
    "Tag count cannot exceed review count",
  );
export const ReviewSummarySchema = z
  .object({
    strengths: z.array(DisplaySchema),
    complaints: z.array(DisplaySchema),
    one_liner: DisplaySchema,
  })
  .strict();

// Relative uploads and ordinary HTTPS URLs only; no executable/data URLs.
export const MediaUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      (/^\/(?:uploads|audio|tts)\/[A-Za-z0-9_./-]+$/.test(value) && !value.includes("..")) ||
      (() => {
        try {
          const url = new URL(value);
          return url.protocol === "https:" && !url.username && !url.password;
        } catch {
          return false;
        }
      })(),
    "Expected a local media path or HTTPS URL",
  );

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export const JsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonSchema),
    z.record(JsonSchema),
  ]),
);
export const JsonObjectSchema = z.record(JsonSchema);

export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Trade = z.infer<typeof TradeSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
