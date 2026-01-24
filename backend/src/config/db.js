const { PrismaClient } = require('../../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

function prismaClientSingleton() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // max connections - increased for better concurrency
    min: 2,  // keep minimum connections ready
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // faster timeout
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ['query', 'error', 'warn'],
  });
};

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'PRODUCTION') {
  globalThis.prismaGlobal = prisma;
}

module.exports = prisma;
