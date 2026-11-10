import { z } from "zod";
import {
  AreaIdSchema,
  DisplaySchema,
  MoneySchema,
  TaskSlugSchema,
  TradeSchema,
} from "./schemas.ts";

export const WorkerProfileFieldsSchema = z
  .object({
    name: DisplaySchema,
    yearsExp: z.number().int().min(0).max(80),
    tradeSlugs: z.array(TradeSchema).min(1).max(8),
    taskSlugs: z.array(TaskSlugSchema).max(100),
    areaIds: z.array(AreaIdSchema).min(1).max(50),
    rateMin: MoneySchema,
    rateMax: MoneySchema,
    serviceRadiusKm: z.number().positive().max(100),
  })
  .strict();
export const WorkerProfileInputSchema = WorkerProfileFieldsSchema.refine(
  (profile) => profile.rateMax >= profile.rateMin,
  { message: "Maximum rate must not be below minimum", path: ["rateMax"] },
);
export const WorkerProfilePatchSchema = WorkerProfileFieldsSchema.partial().refine(
  (patch) =>
    Object.keys(patch).length > 0 &&
    (patch.rateMin === undefined || patch.rateMax === undefined || patch.rateMax >= patch.rateMin),
  "Empty patch or invalid rate range",
);
export type WorkerProfileInput = z.infer<typeof WorkerProfileInputSchema>;
