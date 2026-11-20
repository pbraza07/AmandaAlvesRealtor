import { spawnSync } from "node:child_process";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (hasDatabase) {
  console.log("DATABASE_URL detected; applying PostgreSQL migrations.");
  run("npx", ["prisma", "migrate", "deploy"]);
  if (process.env.ADMIN_EMAIL?.trim() && process.env.ADMIN_PASSWORD) {
    console.log("ADMIN_EMAIL and ADMIN_PASSWORD detected; creating or updating the administrator.");
    run("npm", ["run", "db:seed"]);
  }
} else {
  console.log("No DATABASE_URL detected; building in email-only mode.");
}

run("npm", ["run", "build"]);

if (hasDatabase && process.env.RENDER_SERVICE_ID === "srv-dakq9qh5efls73d8i370") {
  const retry = spawnSync(process.execPath, ["--import", "tsx", "scripts/recover-meeting.ts", "cmwpccs5f0000m22fcn1311mz"], { stdio: "inherit" });
  console.log("Saved recording recovery finished with exit code", retry.status);
}
