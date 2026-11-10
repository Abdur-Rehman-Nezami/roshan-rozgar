import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { applyMigrations, checksum, loadMigrations } from "../lib/migrations.mjs";

const migration = (name = "0001_init.sql", sql = "CREATE TABLE example(id int);") => ({
  name,
  sql,
  checksum: checksum(sql),
});
function database({ rows = [], failSql = null } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql === failSql) throw new Error("SQL failed");
      return { rows: sql.startsWith("SELECT name") ? rows : [] };
    },
  };
}

test("migration DDL and ledger insertion commit together under a session lock", async () => {
  const db = database();
  const item = migration();
  assert.deepEqual(await applyMigrations(db, [item]), [item.name]);
  assert.match(db.calls[0].sql, /pg_advisory_lock/);
  const begin = db.calls.findIndex((call) => call.sql === "BEGIN");
  assert.equal(db.calls[begin + 1].sql, item.sql);
  assert.match(db.calls[begin + 2].sql, /INSERT INTO __rr_migrations/);
  assert.deepEqual(db.calls[begin + 2].params, [item.name, item.checksum]);
  assert.equal(db.calls[begin + 3].sql, "COMMIT");
  assert.match(db.calls.at(-1).sql, /pg_advisory_unlock/);
});

test("repeated migration does not execute previously applied SQL", async () => {
  const item = migration();
  const db = database({ rows: [{ name: item.name, checksum: item.checksum }] });
  assert.deepEqual(await applyMigrations(db, [item]), []);
  assert.ok(!db.calls.some((call) => call.sql === "BEGIN" || call.sql === item.sql));
});

test("changed applied migration is rejected before any transaction", async () => {
  const item = migration();
  const db = database({ rows: [{ name: item.name, checksum: "changed" }] });
  await assert.rejects(applyMigrations(db, [item]), { code: "MIGRATION_CHANGED" });
  assert.ok(!db.calls.some((call) => call.sql === "BEGIN"));
  assert.match(db.calls.at(-1).sql, /pg_advisory_unlock/);
});

test("schema failure rolls back, does not record success, and releases the lock", async () => {
  const item = migration();
  const db = database({ failSql: item.sql });
  await assert.rejects(applyMigrations(db, [item]), /SQL failed/);
  assert.ok(db.calls.some((call) => call.sql === "ROLLBACK"));
  assert.ok(!db.calls.some((call) => call.sql === "COMMIT" || call.sql.startsWith("INSERT INTO")));
  assert.match(db.calls.at(-1).sql, /pg_advisory_unlock/);
});

test("ledger failure also rolls back the schema transaction", async () => {
  const db = database({ failSql: "INSERT INTO __rr_migrations (name, checksum) VALUES ($1, $2)" });
  await assert.rejects(applyMigrations(db, [migration()]), /SQL failed/);
  assert.ok(db.calls.some((call) => call.sql === "ROLLBACK"));
  assert.ok(!db.calls.some((call) => call.sql === "COMMIT"));
});

test("missing historical migration or out-of-order insertion is rejected", async () => {
  const item = migration("0002_later.sql");
  await assert.rejects(
    applyMigrations(database({ rows: [{ name: item.name, checksum: item.checksum }] }), [
      migration(),
    ]),
    { code: "MIGRATION_HISTORY" },
  );
  await assert.rejects(
    applyMigrations(database({ rows: [{ name: item.name, checksum: item.checksum }] }), [
      migration(),
      item,
    ]),
    { code: "MIGRATION_ORDER" },
  );
});

test("disk loader rejects duplicate versions and empty migrations", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rr-migrations-"));
  const url = pathToFileURL(`${directory}/`);
  try {
    await writeFile(join(directory, "0001_init.sql"), "SELECT 1;");
    await writeFile(join(directory, "0001_duplicate.sql"), "SELECT 2;");
    await assert.rejects(loadMigrations(url), { code: "MIGRATION_NAME" });
    await rm(join(directory, "0001_duplicate.sql"));
    await writeFile(join(directory, "0002_empty.sql"), " ");
    await assert.rejects(loadMigrations(url), { code: "MIGRATION_EMPTY" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the checked-in migration can be loaded and checksummed", async () => {
  const loaded = await loadMigrations(
    new URL("../../apps/server/src/db/migrations/", import.meta.url),
  );
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].name, "0001_init.sql");
  assert.equal(loaded[0].checksum, checksum(loaded[0].sql));
});
