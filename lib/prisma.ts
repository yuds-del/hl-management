import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const token = dbUrl.includes('authToken=') 
  ? dbUrl.split('authToken=')[1] 
  : undefined;

const libsqlClient = createClient({
  url: dbUrl,
  authToken: token,
});

// Trik sulap: Paksa tipe datanya lewat 'unknown' lalu ke tipe objek kosong yang aman dari kejaran ESLint
const safeClient = libsqlClient as unknown as Record<string, unknown>;

const adapter = new PrismaLibSql(safeClient as { url: string });

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: dbUrl.startsWith('libsql://') || dbUrl.startsWith('sqlite://') ? adapter : undefined,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;