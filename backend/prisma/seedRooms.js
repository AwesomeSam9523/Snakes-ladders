const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRooms() {
  console.log('🌱 Seeding rooms...');

  // Define 15 rooms with varying capacities
  const rooms = [
    { roomNumber: 'AB1 301', capacity: 8 },
    { roomNumber: 'AB1 302', capacity: 6 },
    { roomNumber: 'AB1 303', capacity: 7 },
    { roomNumber: 'AB1 304', capacity: 9 },
    { roomNumber: 'AB1 305', capacity: 5 },
    { roomNumber: 'AB1 306', capacity: 8 },
    { roomNumber: 'AB1 307', capacity: 7 },
    { roomNumber: 'AB1 308', capacity: 6 },
    { roomNumber: 'AB1 309', capacity: 10 },
    { roomNumber: 'AB1 310', capacity: 7 },
    { roomNumber: 'AB1 311', capacity: 8 },
    { roomNumber: 'AB1 312', capacity: 6 },
    { roomNumber: 'AB1 313', capacity: 9 },
    { roomNumber: 'AB1 314', capacity: 7 },
    { roomNumber: 'AB1 315', capacity: 8 },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: { capacity: room.capacity },
      create: room,
    });
  }

  console.log('✅ Rooms seeded successfully!');
  console.log(`Total rooms: ${rooms.length}`);
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
