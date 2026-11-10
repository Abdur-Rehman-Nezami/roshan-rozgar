import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { supervise } from "./lib/supervisor.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = fileURLToPath(new URL("../apps/server/", import.meta.url));
const nodeFlags = ["--watch", "--conditions=development", "--env-file-if-exists=../../.env"];

const children = [
  spawn(process.execPath, [...nodeFlags, "src/main.ts"], { cwd: server, stdio: "inherit" }),
  spawn(process.execPath, [...nodeFlags, "src/jobs.ts"], { cwd: server, stdio: "inherit" }),
  spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "apps/web",
      "--config",
      "apps/web/vite.config.ts",
      "--host",
      "127.0.0.1",
      "--port",
      "5173",
      "--strictPort",
    ],
    { cwd: root, stdio: "inherit" },
  ),
];

const supervisor = supervise(children, {
  onStop: (code) => {
    process.exitCode = code;
  },
});
process.once("SIGINT", () => supervisor.stop(0));
process.once("SIGTERM", () => supervisor.stop(0));
