import { APP_NAME, DEFAULT_TIMEZONE } from "@roshan/shared";

// F-05 attaches Fastify and service dependencies. This module establishes
// the shared package import without pretending the backend exists yet.
export const serviceInfo = {
  name: APP_NAME,
  timezone: DEFAULT_TIMEZONE,
  phase: "foundation",
} as const;
