const { PrismaClient } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=30&connect_timeout=15'
      }
    }
  })
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()


if (process.env.NODE_ENV !== 'PRODUCTION')
  globalThis.prismaGlobal = prisma;

module.exports = prisma;
