const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRooms() {
  console.log('🌱 Seeding rooms...');

  // Define 15 rooms with varying capacities and types
  // TECH rooms (6): AB1 301-306 - for coding questions and snake positions
  // NON-TECH rooms (9): AB1 307-315 - for numerical, MCQ, physical questions
  const rooms = [
    { roomNumber: 'AB1 301', capacity: 8, roomType: 'TECH' },
    { roomNumber: 'AB1 302', capacity: 6, roomType: 'TECH' },
    { roomNumber: 'AB1 303', capacity: 7, roomType: 'TECH' },
    { roomNumber: 'AB1 304', capacity: 9, roomType: 'TECH' },
    { roomNumber: 'AB1 305', capacity: 5, roomType: 'TECH' },
    { roomNumber: 'AB1 306', capacity: 8, roomType: 'TECH' },
    { roomNumber: 'AB1 307', capacity: 7, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 308', capacity: 6, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 309', capacity: 10, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 310', capacity: 7, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 311', capacity: 8, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 312', capacity: 6, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 313', capacity: 9, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 314', capacity: 7, roomType: 'NON_TECH' },
    { roomNumber: 'AB1 315', capacity: 8, roomType: 'NON_TECH' },
  ];

  await prisma.room.createMany({
    data: rooms,
    skipDuplicates: true,
  })

  const techRooms = rooms.filter(r => r.roomType === 'TECH');
  const nonTechRooms = rooms.filter(r => r.roomType === 'NON_TECH');

  console.log('✅ Rooms seeded successfully!');
  console.log(`Total rooms: ${rooms.length}`);
  console.log(`  - TECH rooms (${techRooms.length}): ${techRooms.map(r => r.roomNumber).join(', ')}`);
  console.log(`  - NON-TECH rooms (${nonTechRooms.length}): ${nonTechRooms.map(r => r.roomNumber).join(', ')}`);
  console.log(`Total capacity: ${rooms.reduce((sum, r) => sum + r.capacity, 0)} teams`);
}

seedRooms()
  .catch((e) => {
    console.error('❌ Error seeding rooms:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
