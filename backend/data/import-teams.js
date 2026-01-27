const XLSX = require('xlsx');
const path = require('path');
const prisma = require('../src/config/db');
const { hashPassword } = require('../src/utils/password.util');

// Helper function to find an available room with capacity from database
async function findAvailableRoom() {
  const rooms = await prisma.room.findMany();
  const roomCounts = await prisma.team.groupBy({
    by: ['currentRoom'],
    _count: { id: true },
    where: { status: 'ACTIVE' },
  });

  const roomCountMap = {};
  roomCounts.forEach(rc => {
    roomCountMap[rc.currentRoom] = rc._count.id;
  });

  for (const room of rooms) {
    const count = roomCountMap[room.roomNumber] || 0;
    if (count < room.capacity) {
      return room.roomNumber;
    }
  }

  throw new Error('All rooms are full. Maximum capacity reached.');
}

// Helper function to find available map (10 teams per map, FCFS)
async function findAvailableMap() {
  const MAP_CAPACITY = 10;
  const maps = await prisma.boardMap.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (maps.length === 0) {
    throw new Error('No active maps available. Please create maps first.');
  }

  const mapCounts = await prisma.team.groupBy({
    by: ['mapId'],
    _count: { id: true },
    where: { mapId: { not: null } },
  });

  const mapCountMap = {};
  mapCounts.forEach(mc => {
    mapCountMap[mc.mapId] = mc._count.id;
  });

  for (const map of maps) {
    const count = mapCountMap[map.id] || 0;
    if (count < MAP_CAPACITY) {
      return map.id;
    }
  }

  throw new Error('All maps are at capacity (10 teams each)');
}

async function importTeams() {
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, 'DEMO PARTICIPANTS LOGIN.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${data.length} teams in Excel file`);
    console.log('Starting import...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        // Expected columns: TeamCode/TEAM ID, TeamName, Password/PASSWORD, Members (comma-separated)
        const teamCode = row.TeamCode || row['Team Code'] || row.teamCode || row['TEAM ID'] || row['Team ID'];
        const teamName = row.TeamName || row['Team Name'] || row.teamName || row['TEAM NAME'];
        const password = row.Password || row.password || row.PASSWORD;
        const membersStr = row.Members || row.members || row.MEMBERS || '';

        if (!teamCode || !password) {
          console.log(`⚠️  Skipping row - missing TeamCode or Password:`, row);
          skipCount++;
          continue;
        }

        // If no team name provided, generate one from teamCode
        const finalTeamName = teamName || `Team ${teamCode}`;

        // Check if team already exists
        const existingTeam = await prisma.team.findUnique({
          where: { teamCode: teamCode.toString() },
        });

        if (existingTeam) {
          console.log(`⏭️  ${teamCode} already exists, skipping...`);
          skipCount++;
          continue;
        }

        // Parse members
        const members = membersStr
          .split(',')
          .map(m => m.trim())
          .filter(m => m.length > 0);

        if (members.length === 0) {
          members.push('Member 1', 'Member 2', 'Member 3'); // Default members
        }

        // Hash password
        const hashedPassword = await hashPassword(password.toString());

        // Get available room and map
        const assignedRoom = await findAvailableRoom();
        const assignedMapId = await findAvailableMap();

        // Create team
        const team = await prisma.team.create({
          data: {
            teamCode: teamCode.toString(),
            teamName: finalTeamName.toString(),
            currentRoom: assignedRoom,
            mapId: assignedMapId,
            members: {
              create: members.map(name => ({ name })),
            },
          },
          include: {
            members: true,
            map: true,
          },
        });

        // Create User entry for login
        await prisma.user.create({
          data: {
            username: teamCode.toString(),
            password: hashedPassword,
            role: 'PARTICIPANT',
            teamId: team.id,
          },
        });

        console.log(`✅ ${teamCode} - ${finalTeamName} created successfully`);
        successCount++;

      } catch (rowError) {
        console.error(`❌ Error processing team:`, row, rowError.message);
        errorCount++;
      }
    }

    console.log('Import Summary:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importTeams();
