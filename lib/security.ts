import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "aa_admin_session";
const ttl = 1000 * 60 * 60 * 8;
export const hashToken = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const clean = (value: unknown, max = 4000) => String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);

export async function createSession(userId: string) {
  const raw = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { tokenHash: hashToken(raw), userId, expiresAt: new Date(Date.now() + ttl) } });
  (await cookies()).set(COOKIE, raw, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: ttl / 1000 });
}

export async function destroySession() {
  const store = await cookies(); const raw = store.get(COOKIE)?.value;
  if (raw) await prisma.session.deleteMany({ where: { tokenHash: hashToken(raw) } });
  store.set(COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
}

export async function getAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value; if (!raw) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function requireAdmin() { const user = await getAdmin(); if (!user) throw new Error("UNAUTHORIZED"); return user; }

export async function verifyOrigin() {
  const h = await headers(); const origin = h.get("origin"); const host = h.get("host");
  if (origin && host && new URL(origin).host !== host) throw new Error("INVALID_ORIGIN");
}

const buckets = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now(); const valid = (buckets.get(key) ?? []).filter(t => t > now - windowMs);
  if (valid.length >= max) return false; valid.push(now); buckets.set(key, valid); return true;
}
