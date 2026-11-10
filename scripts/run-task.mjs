import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const tasks = {
  "db:migrate": { file: "scripts/migrate.mjs", task: "F-04" },
  "db:seed": { file: "scripts/seed.ts", task: "D-02" },
  "audio:build": { file: "scripts/audio-build.ts", task: "C-02" },
  "eval:triage": { file: "scripts/eval-triage.ts", task: "D-06" },
  e2e: { file: "node_modules/@playwright/test/cli.js", task: "B-05", args: ["test"] },
};
const task = tasks[process.argv[2]];
if (!task || !existsSync(new URL(`../${task.file}`, import.meta.url))) {
  console.error(
    `Task unavailable: ${process.argv[2] ?? "missing name"}. Implement ${task?.task ?? "a supported task"} first; see PROGRESS.md.`,
  );
  process.exitCode = 1;
} else {
  const child = spawn(
    process.execPath,
    [
      "--conditions=development",
      "--env-file-if-exists=.env",
      task.file,
      ...(task.args ?? []),
      ...process.argv.slice(3),
    ],
    { cwd: root, stdio: "inherit" },
  );
  child.once("error", () => {
    console.error("Unable to start task process.");
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
  process.once("SIGINT", () => child.kill("SIGINT"));
  process.once("SIGTERM", () => child.kill("SIGTERM"));
}
