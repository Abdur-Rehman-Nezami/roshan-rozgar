import { cp, mkdir } from "node:fs/promises";

const source = new URL("../apps/server/src/", import.meta.url);
const destination = new URL("../apps/server/dist/", import.meta.url);
for (const asset of ["ai/fake/", "db/migrations/", "db/schema.mjs"]) {
  const output = new URL(asset, destination);
  await mkdir(new URL("./", output), { recursive: true });
  await cp(new URL(asset, source), output, { recursive: true });
}
