import { z } from "zod";
import {
  AreaIdSchema,
  DisplaySchema,
  MoneySchema,
  ReviewSummarySchema,
  ReviewTagsSchema,
  TaskSlugSchema,
  TimeRangeSchema,
  TradeSchema,
  UrgencySchema,
} from "./schemas.ts";
import { ActionNameSchema, ElementIdSchema, ScreenIdSchema, ScreenSpecSchema } from "./screens.ts";
import { WorkerProfilePatchSchema } from "./profile.ts";
import type { ScreenSpec } from "./screens.ts";

export const AssistantOutputSchema = z
  .object({
    say: DisplaySchema,
    action: ActionNameSchema,
    target: ElementIdSchema.nullable(),
    field: z.string().nullable(),
    value: z.string().nullable(),
    screen: ScreenIdSchema.nullable(),
    sourceIds: z.array(z.string()),
  })
  .strict();
export const TriageOutputSchema = z
  .object({
    trade_slug: TradeSchema,
    task_slug: TaskSlugSchema,
    urgency: UrgencySchema,
    summary: DisplaySchema,
    followUpIds: z.array(z.string()).max(3),
    safetyTipId: z.string(),
    citedDocIds: z.array(z.string()),
  })
  .strict();
const confidence = z.number().min(0).max(1);
const extraction = <S extends z.ZodTypeAny>(value: S) =>
  z.object({ value, display: DisplaySchema, confidence }).strict();
export const ReviewExtractionSchema = z
  .object({ tags: ReviewTagsSchema, stars: z.number().int().min(1).max(5), summary: DisplaySchema })
  .strict();
export const AI_OUTPUT_SCHEMAS = {
  assistant_turn: AssistantOutputSchema,
  extract_name: extraction(z.string().trim().min(1).max(120)),
  extract_years: extraction(z.number().int().min(0).max(80)),
  extract_jobs: extraction(
    z
      .object({ tradeSlugs: z.array(TradeSchema).min(1), taskSlugs: z.array(TaskSlugSchema) })
      .strict(),
  ),
  extract_areas: extraction(z.array(AreaIdSchema).min(1)),
  extract_rate: extraction(
    z
      .object({ min: MoneySchema, max: MoneySchema })
      .strict()
      .refine((rate) => rate.max >= rate.min, "Invalid rate range"),
  ),
  apply_correction: z.object({ patch: WorkerProfilePatchSchema, readBack: DisplaySchema }).strict(),
  parse_availability: z
    .object({ slots: z.array(TimeRangeSchema).max(30), readBack: DisplaySchema })
    .strict(),
  parse_offer: z
    .object({
      intent: z.enum(["accept", "counter", "decline"]),
      price: MoneySchema.nullable(),
      readBack: DisplaySchema,
    })
    .strict()
    .refine(
      (offer) => offer.intent !== "counter" || offer.price !== null,
      "Counter requires a price",
    ),
  translate_message: DisplaySchema,
  summarize_request: z.object({ line: DisplaySchema }).strict(),
  vision_problem: z
    .object({
      trade_slug: TradeSchema,
      task_slug: TaskSlugSchema.nullable(),
      issue: DisplaySchema,
      hazards: z.array(DisplaySchema),
      too_dark: z.boolean(),
    })
    .strict(),
  triage: TriageOutputSchema,
  // Deliberately excludes prices/area: those are copied from authoritative state.
  agreement_card: z.object({ job: DisplaySchema, when_text: DisplaySchema }).strict(),
  extract_review: ReviewExtractionSchema,
  summarize_reviews: ReviewSummarySchema,
  tag_work_photo: z
    .object({ task_slugs: z.array(TaskSlugSchema), caption: DisplaySchema })
    .strict(),
} as const;
export type AiRoute = keyof typeof AI_OUTPUT_SCHEMAS;
export type AiOutput<R extends AiRoute> = z.infer<(typeof AI_OUTPUT_SCHEMAS)[R]>;
export const AI_ROUTES = Object.keys(AI_OUTPUT_SCHEMAS) as AiRoute[];
export const AI_EFFORT = Object.fromEntries(
  AI_ROUTES.map((route) => [
    route,
    ["triage", "vision_problem", "agreement_card", "summarize_reviews"].includes(route)
      ? "medium"
      : "low",
  ]),
) as Record<AiRoute, "low" | "medium">;

/** Validate against the trusted registered screen, not model-supplied capabilities. */
export function validateAssistantOutput(input: unknown, spec: ScreenSpec) {
  ScreenSpecSchema.parse(spec);
  const output = AssistantOutputSchema.parse(input);
  if (!spec.actions.includes(output.action))
    throw new Error("Action is not allowed on this screen");
  if (output.target !== null && !spec.elements.some((element) => element.id === output.target))
    throw new Error("Target is not registered on this screen");
  if (["highlight", "toggle", "startRecording"].includes(output.action) && output.target === null)
    throw new Error("Action requires a registered target");
  if (["fillField", "selectOption"].includes(output.action)) {
    const field = spec.fields?.find((item) => item.id === output.field);
    if (!field || output.value === null)
      throw new Error("Action requires a registered field and value");
    if (field.type === "choice" && !field.options?.includes(output.value))
      throw new Error("Unknown field choice");
    if (field.type === "number" && (!output.value.trim() || !Number.isFinite(Number(output.value))))
      throw new Error("Expected a numeric value");
  }
  if (output.action === "navigate" && output.screen === null)
    throw new Error("Navigation requires a screen");
  return output;
}

/** RAG outputs may cite/select only the concrete retrieved context for this call. */
export function validateTriageOutput(
  input: unknown,
  context: {
    trades: string[];
    tasks: string[];
    docIds: string[];
    followUpIds: string[];
    safetyTipIds: string[];
  },
) {
  const output = TriageOutputSchema.parse(input);
  if (
    !output.task_slug.startsWith(`${output.trade_slug}.`) ||
    !context.trades.includes(output.trade_slug) ||
    !context.tasks.includes(output.task_slug) ||
    !context.docIds.length ||
    !output.citedDocIds.length ||
    output.citedDocIds.some((id) => !context.docIds.includes(id)) ||
    output.followUpIds.some((id) => !context.followUpIds.includes(id)) ||
    !context.safetyTipIds.includes(output.safetyTipId)
  )
    throw new Error("Triage references data outside retrieved context");
  return output;
}
