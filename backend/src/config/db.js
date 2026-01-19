const { PrismaClient } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?connection_limit=15&pool_timeout=20&connect_timeout=10'
      }
    }
  })
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()


if (process.env.NODE_ENV !== 'PRODUCTION')
  globalThis.prismaGlobal = prisma;

module.exports = prisma;
