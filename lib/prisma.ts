import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const fallbackUrl = "postgresql://unused:unused@127.0.0.1:1/unused?schema=public";
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL || fallbackUrl });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
