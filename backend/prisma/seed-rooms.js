const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRooms() {
  console.log('🌱 Seeding rooms...');
  const rooms = [
    // FLOOR 1 
    { roomNumber: 'AB1 128', capacity: 8, floor: 1, roomType: 'TECH' },
    { roomNumber: 'AB1 129', capacity: 7, floor: 1, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 130', capacity: 6, floor: 1, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 131', capacity: 9, floor: 1, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 105', capacity: 9, floor: 1, roomType: 'NON_TECH' },
    
    
    // FLOOR 2 
    { roomNumber: 'AB1 209', capacity: 8, floor: 2, roomType: 'TECH' },
    { roomNumber: 'AB1 210', capacity: 7, floor: 2, roomType: 'TECH' },
    { roomNumber: 'AB1 211', capacity: 6, floor: 2, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 217', capacity: 9, floor: 2, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 225', capacity: 8, floor: 2, roomType: 'NON_TECH' },
  
     // FLOOR 3 
    { roomNumber: 'AB1 311', capacity: 8, floor: 3, roomType: 'TECH' },
    { roomNumber: 'AB1 312', capacity: 7, floor: 3, roomType: 'TECH' },
    { roomNumber: 'AB1 319', capacity: 6, floor: 3, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 320', capacity: 9, floor: 3, roomType: 'NON_TECH' },
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
