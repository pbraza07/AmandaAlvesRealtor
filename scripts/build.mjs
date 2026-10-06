import { spawnSync } from "node:child_process";

const buildEnv = { ...process.env };
if (!buildEnv.DATABASE_URL) {
  buildEnv.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/unused?schema=public";
  buildEnv.DATABASE_MODE = "disabled";
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: buildEnv, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);
run("npx", ["next", "build"]);
