const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRooms() {
  console.log('🌱 Seeding rooms...');

  // Define 14 rooms across 2 floors (7 rooms per floor)
  // Floor 1: AB1 101-107 (3 TECH + 4 NON-TECH)
  // Floor 2: AB1 201-207 (3 TECH + 4 NON-TECH)
  // Teams alternate floors on each checkpoint
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
    skipDuplicates: true,
  })

  const floor1Rooms = rooms.filter(r => r.floor === 1);
  const floor2Rooms = rooms.filter(r => r.floor === 2);
  const techRooms = rooms.filter(r => r.roomType === 'TECH');
  const nonTechRooms = rooms.filter(r => r.roomType === 'NON_TECH');

  console.log('✅ Rooms seeded successfully!');
  console.log(`Total rooms: ${rooms.length}`);
  console.log(`\n📍 Floor 1 (${floor1Rooms.length} rooms): ${floor1Rooms.map(r => r.roomNumber).join(', ')}`);
  console.log(`📍 Floor 2 (${floor2Rooms.length} rooms): ${floor2Rooms.map(r => r.roomNumber).join(', ')}`);
  console.log(`\n  - TECH rooms (${techRooms.length}): ${techRooms.map(r => r.roomNumber).join(', ')}`);
  console.log(`  - NON-TECH rooms (${nonTechRooms.length}): ${nonTechRooms.map(r => r.roomNumber).join(', ')}`);
  console.log(`\nTotal capacity: ${rooms.reduce((sum, r) => sum + r.capacity, 0)} teams`);
}

seedRooms()
  .catch((e) => {
    console.error('❌ Error seeding rooms:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
