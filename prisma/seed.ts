import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultContent } from "../lib/content";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 6) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (6+ characters) before seeding.");
  await prisma.adminUser.upsert({ where: { email }, update: { passwordHash: await bcrypt.hash(password, 12) }, create: { email, passwordHash: await bcrypt.hash(password, 12) } });
  await prisma.siteContent.upsert({ where: { id: "primary" }, update: {}, create: { id: "primary", content: defaultContent } });
  console.log(`Admin ready: ${email}`);
}

main().finally(() => prisma.$disconnect());
