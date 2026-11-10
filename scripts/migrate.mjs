import { applyMigrations, loadMigrations, MigrationError } from "./lib/migrations.mjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL is required. Copy .env.example to .env and start the development database.",
  );
  process.exitCode = 1;
} else {
  let client;
  try {
    const migrations = await loadMigrations(
      new URL("../apps/server/src/db/migrations/", import.meta.url),
    );
    const { Client } = await import("pg");
    client = new Client({
      connectionString,
      application_name: "rr-migrate",
      connectionTimeoutMillis: 5000,
    });
    await client.connect();
    const applied = await applyMigrations(client, migrations);
    console.info(
      applied.length ? `Applied: ${applied.join(", ")}` : "Database migrations are up to date.",
    );
  } catch (error) {
    // Never print the connection URL, credentials, raw SQL or driver parameters.
    console.error(
      error instanceof MigrationError
        ? `${error.code}: ${error.message}`
        : `Migration failed (${error.code ?? error.name ?? "UNKNOWN"}).`,
    );
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
