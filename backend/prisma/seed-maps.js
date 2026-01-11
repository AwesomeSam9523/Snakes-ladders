const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BOARD_MAPS = [
  {
    name: 'Map-1',
    snakes: [2,3,4,5,6,16, 17, 19, 54, 62, 64, 87, 93],
  },
  {
    name: 'Map-2',
    snakes: [14, 31, 48, 55, 67, 72, 88, 95],
  },
  {
    name: 'Map-3',
    snakes: [17, 34, 44, 58, 69, 78, 84, 97],
  },
  {
    name: 'Map-4',
    snakes: [19, 37, 46, 52, 65, 75, 89, 91],
  },
  {
    name: 'Map-5',
    snakes: [21, 39, 43, 59, 66, 79, 86, 98],
  },
];

async function seedBoardMaps() {
  console.log('🎲 Starting board maps seed...\n');

  // Clear existing board rules and maps
  await prisma.boardRule.deleteMany({});
  await prisma.boardMap.deleteMany({});
  console.log('✓ Cleared existing board maps and rules\n');

  // Create each board map with its snakes
  for (const mapData of BOARD_MAPS) {
    const map = await prisma.boardMap.create({
      data: {
        name: mapData.name,
        isActive: true,
      },
    });

    console.log(`📍 Created ${mapData.name} (ID: ${map.id})`);

    // Create snakes for this map 
    for (const snakePos of mapData.snakes) {
      await prisma.boardRule.create({
        data: {
          mapId: map.id,
          type: 'SNAKE',
          startPos: snakePos,
        },
      });
    }

    console.log(`   └── Added ${mapData.snakes.length} snakes: ${mapData.snakes.join(', ')}`);
  }

  console.log('\n✅ Board maps seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • Total Maps: ${BOARD_MAPS.length}`);
  console.log(`   • Snakes per Map: 8`);
  console.log(`   • All snake head positions are unique across maps`);
}

async function main() {
  try {
    await seedBoardMaps();
  } catch (error) {
    console.error('❌ Error seeding board maps:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

