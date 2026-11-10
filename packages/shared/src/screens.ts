import { z } from "zod";
import { PromptIdSchema } from "./prompts.ts";
import { DisplaySchema } from "./schemas.ts";

export const SCREEN_IDS = [
  "W0",
  "W1",
  "W2",
  "W3",
  "W4",
  "W5",
  "W6",
  "W7",
  "W8",
  "W9",
  "W10",
  "W11",
  "W12",
  "W13",
  "W14",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
  "C10",
  "C11",
  "C12",
  "D1",
] as const;
export const ScreenIdSchema = z.enum(SCREEN_IDS);
export type ScreenId = z.infer<typeof ScreenIdSchema>;
export const ACTION_NAMES = [
  "navigate",
  "highlight",
  "fillField",
  "selectOption",
  "toggle",
  "startRecording",
  "confirm",
  "goBack",
  "repeatPrompt",
  "showHelp",
  "none",
] as const;
export const ActionNameSchema = z.enum(ACTION_NAMES);
export type ActionName = z.infer<typeof ActionNameSchema>;
export const ElementIdSchema = z
  .string()
  .max(120)
  .refine(
    (id) =>
      SCREEN_IDS.some((screen) => id.startsWith(`${screen}.`)) &&
      /^(?:W\d+|C\d+|D1)\.[A-Za-z][A-Za-z0-9_.-]*$/.test(id),
    "Unknown screen/element ID",
  );
export type ElementId = `${ScreenId}.${string}`;
export const ELEMENT_IDS = {
  workerMic: "W4.mic",
  workerRetry: "W4.retry",
  workerNext: "W4.next",
  profileOk: "W5.ok",
  profileRedo: "W5.redo",
  editName: "W5.edit.name",
  availability: "W7.toggle",
  acceptOffer: "W8.accept",
  counterOffer: "W8.counter",
  declineOffer: "W8.decline",
  customerMic: "C2.mic",
  customerCamera: "C2.camera",
  emergency: "C2.emergency",
  submitRequest: "C3.submit",
} as const satisfies Record<string, ElementId>;
export const ScreenSpecSchema = z
  .object({
    id: ScreenIdSchema,
    promptId: PromptIdSchema,
    elements: z.array(z.object({ id: ElementIdSchema, label: DisplaySchema }).strict()),
    actions: z.array(ActionNameSchema),
    fields: z
      .array(
        z
          .object({
            id: z.string(),
            type: z.enum(["text", "number", "choice"]),
            options: z.array(z.string()).optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .refine(
    (spec) =>
      spec.elements.every((element) => element.id.startsWith(`${spec.id}.`)) &&
      new Set(spec.elements.map((element) => element.id)).size === spec.elements.length,
    "Elements must belong to this screen and have unique IDs",
  );
export type ScreenSpec = z.infer<typeof ScreenSpecSchema>;
export const SCREEN_ROUTES = {
  W0: "/",
  W1: "/w/mic",
  W2: "/w/phone",
  W3: "/w/trades",
  W4: "/w/interview/:q",
  W5: "/w/profile-review",
  W6: "/w/photos",
  W7: "/w/home",
  W8: null,
  W9: "/w/thread/:id",
  W10: "/w/job/:id",
  W11: "/w/job/:id/done",
  W12: "/w/earnings",
  W13: "/w/reputation",
  W14: "/w/settings",
  C1: "/c/signup",
  C2: "/c/home",
  C3: "/c/describe",
  C4: "/c/request/:id/workers",
  C5: "/c/worker/:id",
  C6: "/c/thread/:id",
  C7: "/c/booking/:id/confirm",
  C8: "/c/booking/:id",
  C9: "/c/booking/:id/pay",
  C10: "/c/booking/:id/review",
  C11: "/c/bookings",
  C12: "/c/settings",
  D1: "/demo",
} as const satisfies Record<ScreenId, string | null>;
