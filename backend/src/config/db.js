const { PrismaClient } = require('../../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

function prismaClientSingleton() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // max connections
    idleTimeoutMillis: 30000,     // close idle connections
    connectionTimeoutMillis: 15000, // fail fast instead of hanging
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
};

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'PRODUCTION') {
  globalThis.prismaGlobal = prisma;
}

module.exports = prisma;
