import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

const LOCK_ID = 1381125449;
export class MigrationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MigrationError";
    this.code = code;
  }
}
export function checksum(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

export async function loadMigrations(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
  const versions = new Set();
  const migrations = [];
  for (const name of files) {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(name) || versions.has(name.slice(0, 4)))
      throw new MigrationError("MIGRATION_NAME", `Invalid or duplicate migration version: ${name}`);
    versions.add(name.slice(0, 4));
    const sql = await readFile(new URL(name, directory), "utf8");
    if (!sql.trim()) throw new MigrationError("MIGRATION_EMPTY", `Empty migration: ${name}`);
    migrations.push({ name, sql, checksum: checksum(sql) });
  }
  if (!migrations.length) throw new MigrationError("MIGRATION_MISSING", "No SQL migrations found");
  return migrations;
}

/** Use one dedicated connected pg client, never pool.query, for lock + transactions. */
export async function applyMigrations(client, migrations) {
  await client.query("SELECT pg_advisory_lock($1::bigint)", [LOCK_ID]);
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS __rr_migrations (
      name text PRIMARY KEY,
      checksum char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const history = await client.query("SELECT name, checksum FROM __rr_migrations ORDER BY name");
    const available = new Map(migrations.map((migration) => [migration.name, migration]));
    for (const row of history.rows) {
      const migration = available.get(row.name);
      if (!migration)
        throw new MigrationError(
          "MIGRATION_HISTORY",
          `Applied migration is missing locally: ${row.name}`,
        );
      if (migration.checksum !== row.checksum)
        throw new MigrationError("MIGRATION_CHANGED", `Applied migration was changed: ${row.name}`);
    }
    const applied = new Set(history.rows.map((row) => row.name));
    const results = [];
    for (const migration of migrations) {
      if (migration.checksum !== checksum(migration.sql))
        throw new MigrationError("MIGRATION_CHECKSUM", "Migration content/checksum mismatch");
      if (applied.has(migration.name)) continue;
      // Never silently insert an old migration ahead of an already-applied one.
      if (history.rows.some((row) => row.name > migration.name))
        throw new MigrationError("MIGRATION_ORDER", `Out-of-order migration: ${migration.name}`);
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO __rr_migrations (name, checksum) VALUES ($1, $2)", [
          migration.name,
          migration.checksum,
        ]);
        await client.query("COMMIT");
        results.push(migration.name);
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          throw new AggregateError([error, rollbackError], "Migration and rollback failed");
        }
        throw error;
      }
    }
    return results;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1::bigint)", [LOCK_ID]);
  }
}
