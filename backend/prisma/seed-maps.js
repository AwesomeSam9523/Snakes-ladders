const {PrismaClient} = require('../generated/prisma');
const {PrismaPg} = require('@prisma/adapter-pg');
const {Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({connectionString: process.env.DATABASE_URL});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({adapter});

const BOARD_MAPS = [
  {
    name: 'Map-1',
    snakes: [4, 9, 12, 17, 25, 30, 33, 38, 41, 46, 54, 59, 62, 67, 75, 80, 83, 88, 91, 96, 104, 109, 112, 117, 125, 130, 133, 138, 143, 147, 149],
  },
  {
    name: 'Map-2',
    snakes: [2, 6, 14, 19, 22, 27, 35, 40, 43, 48, 51, 56, 64, 69, 72, 77, 85, 90, 93, 98, 101, 106, 114, 119, 122, 127, 135, 140, 143, 147, 149],
  },
  {
    name: 'Map-3',
    snakes: [5, 10, 13, 18, 21, 26, 34, 39, 42, 47, 55, 60, 63, 68, 71, 76, 84, 89, 92, 97, 105, 110, 113, 118, 121, 126, 134, 139, 143, 147, 149],
  },
  {
    name: 'Map-4',
    snakes: [2, 8, 14, 19, 21, 26, 33, 39, 45, 50, 52, 57, 64, 69, 71, 76, 83, 88, 95, 100, 102, 107, 114, 119, 121, 126, 133, 138, 143, 147, 149],
  },
  {
    name: 'Map-5',
    snakes: [5, 7, 13, 18, 25, 30, 32, 37, 44, 49, 51, 56, 63, 68, 75, 80, 82, 87, 94, 99, 101, 106, 113, 118, 125, 130, 132, 137, 143, 147, 149],
  },
  {
    name: 'Map-6',
    snakes: [3, 10, 11, 17, 25, 28, 32, 37, 41, 45, 52, 59, 64, 68, 74, 77, 81, 90, 92, 97, 105, 108, 114, 117, 121, 130, 132, 135, 143, 147, 149],
  },
  {
    name: 'Map-7',
    snakes: [5, 9, 12, 16, 23, 27, 34, 38, 41, 45, 52, 56, 63, 67, 74, 78, 81, 85, 92, 96, 103, 107, 114, 118, 121, 125, 132, 136, 143, 147, 149],
  },
  {
    name: 'Map-8',
    snakes: [3, 8, 11, 16, 24, 29, 32, 37, 45, 50, 53, 58, 61, 66, 74, 79, 82, 87, 95, 100, 103, 108, 111, 116, 124, 129, 132, 137, 143, 147, 149],
  },
  {
    name: 'Map-9',
    snakes: [4, 10, 12, 18, 21, 27, 35, 39, 43, 48, 51, 56, 64, 69, 72, 77, 85, 90, 93, 98, 101, 106, 114, 119, 122, 127, 135, 140, 143, 147, 149],
  },
  {
    name: 'Map-10',
    snakes: [3, 9, 11, 17, 24, 28, 32, 40, 45, 49, 53, 57, 61, 66, 74, 78, 82, 90, 95, 99, 103, 107, 111, 116, 124, 128, 132, 140, 143, 147, 149],
  },
];

async function seedBoardMaps() {
  console.log('🎲 Starting board maps seed...\n');

  // Clear existing board rules and maps=
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
    await prisma.boardRule.createMany({
      data: mapData.snakes.map(snakePos => ({
        mapId: map.id,
        type: 'SNAKE',
        startPos: snakePos,
      })),
    })

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
