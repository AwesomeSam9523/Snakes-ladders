const prisma = require('./src/config/db');

async function checkTimers() {
  const teams = await prisma.team.findMany({
    select: {
      teamCode: true,
      totalTimeSec: true,
      timerStartedAt: true,
      timerPaused: true,
      status: true,
    },
    orderBy: { teamCode: 'asc' },
  });

  console.log('Teams Timer Status:');
  teams.forEach(team => {
    console.log(`${team.teamCode}: ${team.totalTimeSec}s, Started: ${team.timerStartedAt ? 'Yes' : 'No'}, Paused: ${team.timerPaused}, Status: ${team.status}`);
  });

  await prisma.$disconnect();
}

checkTimers().catch(console.error);
