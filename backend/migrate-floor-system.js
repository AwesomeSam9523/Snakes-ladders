const { PrismaClient } = require('./generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateFloorSystem() {
  console.log('🔄 Starting floor system migration...\n');

  try {
    // Step 1: Delete old rooms
    console.log('Step 1: Removing old rooms...');
    await prisma.room.deleteMany({});
    console.log('✅ Old rooms removed\n');

    // Step 2: Create new rooms with floor numbers
    console.log('Step 2: Creating new 14 rooms (7 per floor)...');
    const rooms = [
      // FLOOR 1 - 7 rooms
      { roomNumber: 'AB1 101', capacity: 8, floor: 1, roomType: 'TECH' },
      { roomNumber: 'AB1 102', capacity: 7, floor: 1, roomType: 'TECH' },
      { roomNumber: 'AB1 103', capacity: 6, floor: 1, roomType: 'TECH' },
      { roomNumber: 'AB1 104', capacity: 9, floor: 1, roomType: 'NON_TECH' },
      { roomNumber: 'AB1 105', capacity: 8, floor: 1, roomType: 'NON_TECH' },
      { roomNumber: 'AB1 106', capacity: 7, floor: 1, roomType: 'NON_TECH' },
      { roomNumber: 'AB1 107', capacity: 10, floor: 1, roomType: 'NON_TECH' },
      
      // FLOOR 2 - 7 rooms
      { roomNumber: 'AB1 201', capacity: 8, floor: 2, roomType: 'TECH' },
      { roomNumber: 'AB1 202', capacity: 7, floor: 2, roomType: 'TECH' },
      { roomNumber: 'AB1 203', capacity: 6, floor: 2, roomType: 'TECH' },
      { roomNumber: 'AB1 204', capacity: 9, floor: 2, roomType: 'NON_TECH' },
      { roomNumber: 'AB1 205', capacity: 8, floor: 2, roomType: 'NON_TECH' },
      { roomNumber: 'AB1 206', capacity: 7, floor: 2, roomType: 'NON_TECH' },
      { roomNumber: 'AB1 207', capacity: 10, floor: 2, roomType: 'NON_TECH' },
    ];

    await prisma.room.createMany({
      data: rooms,
    });
    console.log('✅ 14 rooms created\n');

    // Step 3: Update existing teams to new room format
    console.log('Step 3: Updating existing teams to Floor 2 rooms...');
    await prisma.$executeRawUnsafe(`
      UPDATE "Team" 
      SET "currentRoom" = 'AB1 201' 
      WHERE "currentRoom" LIKE 'AB1 3%';
    `);
    console.log('✅ Teams updated\n');

    // Step 4: Verify migration
    const floor1Rooms = await prisma.room.count({ where: { floor: 1 } });
    const floor2Rooms = await prisma.room.count({ where: { floor: 2 } });
    const totalTeams = await prisma.team.count();

    console.log('📊 Migration Summary:');
    console.log(`   Floor 1: ${floor1Rooms} rooms`);
    console.log(`   Floor 2: ${floor2Rooms} rooms`);
    console.log(`   Total teams: ${totalTeams}`);
    console.log('\n✅ Floor system migration completed successfully!');
    console.log('\n📝 Teams will now alternate between floors on each checkpoint.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateFloorSystem()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
