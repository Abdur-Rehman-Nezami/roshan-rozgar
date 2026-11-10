import { Client } from "pg";
import { MVP_AREAS, MVP_TASKS } from "../packages/shared/src/mvp.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required; run migrations before seeding");
const db = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
try {
  await db.connect();
  await db.query("BEGIN");
  for (const a of MVP_AREAS)
    await db.query(
      `INSERT INTO areas(id,city,name_en,name_ur,name_roman,lat,lng)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,
      [a.id, a.city, a.label.en, a.label.ur, a.label.roman, a.lat, a.lng],
    );
  for (const task of MVP_TASKS) {
    await db.query(
      `INSERT INTO trades(slug,name_en,name_ur,name_roman,photo,icon)
      VALUES($1,$2,$3,$4,'',$5) ON CONFLICT(slug) DO NOTHING`,
      [task.trade, task.label.en, task.label.ur, task.label.roman, task.icon],
    );
    await db.query(
      `INSERT INTO rate_card(task_slug,trade_slug,name_en,name_ur,name_roman,price_min,price_max,typical_minutes,is_seeded)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT(task_slug) DO NOTHING`,
      [
        task.id,
        task.trade,
        task.label.en,
        task.label.ur,
        task.label.roman,
        task.min,
        task.max,
        task.minutes,
      ],
    );
  }
  const demos = [
    {
      id: "10000000-0000-4000-8000-000000000001",
      phone: "+923000000001",
      name: "DEMO Ali",
      trades: ["plumber", "electrician"],
      area: "isb-g-9",
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      phone: "+923000000002",
      name: "DEMO Sara",
      trades: ["carpenter", "painter", "mason"],
      area: "isb-g-10",
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      phone: "+923000000003",
      name: "DEMO Imran",
      trades: ["ac_technician", "mechanic", "other"],
      area: "isb-f-10",
    },
  ];
  for (const demo of demos) {
    const area = MVP_AREAS.find((a) => a.id === demo.area)!;
    await db.query(
      `INSERT INTO users(id,role,phone,name_ur,name_roman,area_id,lat,lng,is_seeded)
      VALUES($1,'worker',$2,$3,$3,$4,$5,$6,true) ON CONFLICT DO NOTHING`,
      [demo.id, demo.phone, demo.name, area.id, area.lat, area.lng],
    );
    await db.query(
      `INSERT INTO workers(user_id,years_exp,rate_min,rate_max,profile_complete,availability,profile_text)
      VALUES($1,5,500,3000,true,'free',$2) ON CONFLICT(user_id) DO NOTHING`,
      [demo.id, `${demo.name}: ${demo.trades.join(", ")}`],
    );
    for (const trade of demo.trades)
      await db.query(
        "INSERT INTO worker_trades(worker_id,trade_slug) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [demo.id, trade],
      );
    for (const a of MVP_AREAS.filter((a) => a.city === "islamabad"))
      await db.query(
        "INSERT INTO worker_areas(worker_id,area_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [demo.id, a.id],
      );
    for (const t of MVP_TASKS.filter((t) => demo.trades.includes(t.trade)))
      await db.query(
        "INSERT INTO worker_tasks(worker_id,task_slug) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [demo.id, t.id],
      );
  }
  await db.query("COMMIT");
  console.info(
    "Seeded DEMO catalog, eight rate cards and three worker accounts. No real user data or completed jobs.",
  );
} catch {
  await db.query("ROLLBACK").catch(() => {});
  console.error("Seed failed. Check database readiness and migrations.");
  process.exitCode = 1;
} finally {
  await db.end();
}
