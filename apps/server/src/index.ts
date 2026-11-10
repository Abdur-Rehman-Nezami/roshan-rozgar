import { APP_NAME, DEFAULT_TIMEZONE } from "@roshan/shared";

// Public liveness metadata; dependency readiness is checked separately.
export const serviceInfo = {
  name: APP_NAME,
  timezone: DEFAULT_TIMEZONE,
  phase: "foundation",
} as const;
