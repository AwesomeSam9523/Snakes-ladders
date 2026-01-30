const { PrismaClient } = require('../generated/prisma');
const {Pool} = require("pg");
const {PrismaPg} = require("@prisma/adapter-pg");
require('dotenv').config()

const pool = new Pool({connectionString: process.env.DATABASE_URL});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({adapter});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* =========================
   syncAllTeamPositions
   ========================= */
async function syncAllTeamPositions() {
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      currentPosition: true,
      currentRoom: true,
      checkpoints: {
        where: { status: 'APPROVED' },
        orderBy: { checkpointNumber: 'desc' },
        take: 1,
      },
    },
  });

  const updates = [];

  for (const team of teams) {
    const cp = team.checkpoints[0];
    if (!cp) continue;

    if (
      team.currentPosition !== cp.positionAfter ||
      team.currentRoom !== cp.roomNumber
    ) {
      updates.push(
        prisma.team.update({
          where: { id: team.id },
          data: {
            currentPosition: cp.positionAfter,
            currentRoom: cp.roomNumber,
          },
        })
      );
    }
  }

  if (updates.length) {
    await prisma.$transaction(updates);
  }

  console.log(`Positions synced. Updates: ${updates.length}`)
}

/* =========================
   syncTimer
   ========================= */
async function syncTimer() {
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      totalTimeSec: true,
      status: true,
      timerPaused: true,
      timerStartedAt: true,
      currentPosition: true,
    },
  });

  if (!teams.length) return;

  const now = new Date();
  const updates = [];
  const stops = [];

  for (const team of teams) {
    if (
      team.timerPaused ||
      team.status === 'COMPLETED' ||
      !team.timerStartedAt
    ) continue;

    const elapsed =
      Math.floor((now.getTime() - team.timerStartedAt.getTime()) / 1000);

    if (elapsed <= 0) continue;

    const newTotal = team.totalTimeSec + elapsed;

    updates.push(
      prisma.team.update({
        where: { id: team.id },
        data: {
          totalTimeSec: newTotal,
          timerStartedAt: now,
        },
      })
    );

    if (team.currentPosition >= 150) {
      stops.push(
        prisma.team.update({
          where: { id: team.id },
          data: {
            timerPaused: true,
            timerPausedAt: now,
            status: 'COMPLETED',
          },
        })
      );
    }
  }

  if (updates.length) await prisma.$transaction(updates);
  if (stops.length) await prisma.$transaction(stops);
  console.log(`Timer synced. Updates: ${updates.length} | Stops: ${stops.length}`)
}

/* =========================
   MAIN LOOP
   ========================= */
async function main() {
  // 🔒 advisory lock (prevents overlapping runs)
  const lock =
    await prisma.$queryRaw`SELECT pg_try_advisory_lock(424242) AS locked`;

  if (!lock[0]?.locked) {
    console.log('Another worker already running, exiting.');
    return;
  }

  console.log('Worker started');

  const start = Date.now();
  let second = 0;

  try {
    while (Date.now() - start < 22_000) {
      if (second % 10 === 0) {
        await syncTimer();
      }

      if (second % 10 === 0) {
        await syncAllTeamPositions();
      }

      await sleep(1000);
      second++;
    }
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(424242)`;
    await prisma.$disconnect();
    console.log('Worker finished');
  }
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
