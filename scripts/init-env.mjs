import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const template = await readFile(new URL("../.env.example", import.meta.url), "utf8");
const contents = template
  .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${randomBytes(32).toString("hex")}`)
  .replace(/^DEMO_KEY=.*$/m, `DEMO_KEY=${randomBytes(24).toString("hex")}`);
try {
  await writeFile(new URL("../.env", import.meta.url), contents, { flag: "wx", mode: 0o600 });
  console.info(
    "Created .env with local development secrets. Existing environment files are never replaced.",
  );
} catch (error) {
  if (error.code === "EEXIST") console.info(".env already exists; kept unchanged.");
  else throw error;
}
