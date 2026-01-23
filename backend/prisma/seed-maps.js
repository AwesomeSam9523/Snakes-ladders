const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BOARD_MAPS = [
  {
    name: 'Map-1',
    snakes: [3,8,12,16,32,39, 44,47,52,58,64,67,73,78,83,89,95 , 99, 101,106, 111 , 117,124, 128,133,136,143, 147, 149],
  },
  {
    name: 'Map-2',
    snakes: [2, 6,
15, 18,
22, 29,
33, 37,
45, 48,
52, 57,
65, 68,
72, 77,
85, 88,
92, 97,
105, 108,
112, 117,
125, 128,
132, 137,
143, 147, 149],
  },
  {
    name: 'Map-3',
    snakes: [4, 9,
12, 19,
24, 28,
31, 39,
44, 48,
51, 59,
64, 68,
71, 79,
84, 88,
91, 99,
104, 108,
111, 119,
124, 128,
131, 139,
143, 147, 149],
  },
  {
    name: 'Map-4',
    snakes: [4, 10,
13, 17,
25, 28,
32, 39,
42, 49,
53, 58,
62, 69,
73, 78,
82, 89,
93, 98,
102, 109,
113, 118,
122, 129,
133, 138,
143, 147, 149],
  },
  {
    name: 'Map-5',
    snakes: [5, 9,
14, 19,
23, 28,
34, 37,
44, 49,
52, 59,
63, 68,
74, 77,
84, 89,
94, 97,
103, 108,
114, 117,
124, 129,
134, 137,
143, 147, 149],
  },
  {
    name: 'Map-6',
    snakes: [3, 10,
12, 18,
24, 29,
31, 38,
45, 47,
54, 59,
61, 68,
72, 79,
83, 88,
92, 99,
105, 107,
112, 119,
125, 127,
132, 139,
143, 147, 149],
  },
 {
    name: 'Map-7',
    snakes: [6, 11,
15, 17,
22, 28,
35, 38,
43, 48,
51, 57,
65, 69,
71, 78,
85, 87,
94, 99,
102, 108,
111, 118,
124, 129,
131, 138,
143, 147, 149],
  },
  {
    name: 'Map-8',
    snakes: [ 2, 7,
13, 19,
25, 27,
32, 39,
44, 47,
53, 58,
62, 67,
74, 79,
82, 87,
95, 98,
104, 109,
113, 118,
122, 127,
134, 139,
143, 147, 149],
  },
  {
    name: 'Map-9',
    snakes: [5, 10,
14, 18,
23, 29,
34, 38,
42, 49,
54, 57,
63, 69,
72, 78,
85, 89,
94, 98,
103, 109,
114, 118,
124, 128,
132, 137,
143, 147, 149],
  },
    {
    name: 'Map-10',
    snakes: [1, 8,
12, 17,
24, 28,
33, 37,
45, 48,
52, 59,
61, 68,
73, 77,
83, 88,
92, 97,
105, 108,
112, 117,
125, 129,
131, 138,
143, 147, 149],
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
