const { PrismaClient } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient()
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()


if (process.env.NODE_ENV !== 'PRODUCTION')
  globalThis.prismaGlobal = prisma;

module.exports = prisma;
