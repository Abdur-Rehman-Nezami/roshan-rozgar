import { z } from "zod";
import { IdSchema, MoneySchema, OfferStatusSchema } from "./schemas.ts";
import {
  BookingSchema,
  MessageSchema,
  OfferSchema,
  PublicWorkerSchema,
  RequestCardSchema,
} from "./entities.ts";

export const EVENT_SCHEMAS = {
  "offer:new": z.object({ offer: OfferSchema, request: RequestCardSchema }).strict(),
  "offer:updated": z
    .object({ offerId: IdSchema, status: OfferStatusSchema, counterPrice: MoneySchema.optional() })
    .strict(),
  "request:next_worker": z.object({ requestId: IdSchema, worker: PublicWorkerSchema }).strict(),
  "thread:message": MessageSchema,
  "booking:updated": BookingSchema,
  "worker:visibility": z.object({ workerId: IdSchema, visible: z.boolean() }).strict(),
} as const;
export type EventName = keyof typeof EVENT_SCHEMAS;
export type EventPayload<N extends EventName> = z.infer<(typeof EVENT_SCHEMAS)[N]>;
export type ServerToClientEvents = { [N in EventName]: (payload: EventPayload<N>) => void };

// These helpers generate names only; server authorization must precede joining.
export const rooms = {
  user: (id: string) => `user:${IdSchema.parse(id)}`,
  thread: (id: string) => `thread:${IdSchema.parse(id)}`,
  search: (city: string) => `search:${z.enum(["islamabad", "rawalpindi"]).parse(city)}`,
};
