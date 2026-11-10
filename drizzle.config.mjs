// Handwritten migrations are authoritative; this config supports schema tooling.
// Load .env through Node's --env-file-if-exists=.env when invoking drizzle-kit.
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for Drizzle tooling");

export default {
  dialect: "postgresql",
  schema: "./apps/server/src/db/schema.mjs",
  out: "./apps/server/src/db/generated",
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
};
