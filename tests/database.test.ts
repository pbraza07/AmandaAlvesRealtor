import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase } from "../lib/database";

test("database is optional and can be explicitly disabled", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalMode = process.env.DATABASE_MODE;

  try {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_MODE;
    assert.equal(hasDatabase(), false);

    process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/site";
    assert.equal(hasDatabase(), true);

    process.env.DATABASE_MODE = "disabled";
    assert.equal(hasDatabase(), false);
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalMode === undefined) delete process.env.DATABASE_MODE;
    else process.env.DATABASE_MODE = originalMode;
  }
});
