const disabledValues = new Set(["", "disabled", "false", "off", "none"]);

export function hasDatabase() {
  const mode = String(process.env.DATABASE_MODE ?? "").trim().toLowerCase();
  if (disabledValues.has(mode) && mode !== "") return false;
  const url = String(process.env.DATABASE_URL ?? "").trim();
  return Boolean(url) && !url.includes("127.0.0.1:1/unused");
}

export const databaseFeatureMessage =
  "The public website is running in email-only mode. The private dashboard and saved lead history require PostgreSQL.";
