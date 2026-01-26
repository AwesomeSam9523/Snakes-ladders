const {PrismaClient} = require('./generated/prisma');
const bcrypt = require("bcryptjs");
const {Pool} = require("pg");
const {PrismaPg} = require("@prisma/adapter-pg"); // adjust path
require('dotenv').config();

const pool = new Pool({connectionString: process.env.DATABASE_URL});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({adapter});

const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

async function main() {
  try {
    // 2. Hash password
    const plainPassword = "1234";
    const teamPassword = await hashPassword(plainPassword);

    const teamCount = await prisma.user.findMany({
      where: {
        role: "PARTICIPANT"
      }
    });
    const username = `TEAM${(teamCount.length + 1).toString().padStart(3, '0')}`;

    // 3. Create user
    const team = await prisma.team.create({
      data: {
        teamCode: username,
        teamName: 'Test Team',
        currentPosition: 1,
        currentRoom: 'AB1 301',
        status: 'ACTIVE',
        totalTimeSec: 0,
      },
    });
    const user = await prisma.user.create({
      data: {
        username,
        password: teamPassword,
        role: 'PARTICIPANT',
        teamId: team.id,
      },
    });
    console.log('Username:', username);
    console.log('Plain password:', plainPassword);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
