const XLSX = require('xlsx');
const path = require('path');
const prisma = require('../src/config/db');
const { hashPassword } = require('../src/utils/password.util');

async function importAdmins() {
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, 'ADMIN PORTAL LOGIN.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📋 Found ${data.length} admins in Excel file`);
    
    // Show available columns
    if (data.length > 0) {
      console.log('📊 Available columns:', Object.keys(data[0]));
    }
    
    console.log('🚀 Starting admin import...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        // Expected columns: TEAM ID (used as username), Password/PASSWORD
        // Support multiple column name variants for username
        const username = row['TEAM ID'] || row['ADMIN ID'] || row.Username || row.username || row.USERNAME || row['User Name'] || row['ADMIN_ID'] || row['Admin ID'];
        const password = row.Password || row.password || row.PASSWORD;

        if (!username || !password) {
          console.log(`⚠️  Skipping row - missing username or password:`, row);
          skipCount++;
          continue;
        }

        // Check if admin already exists
        const existingUser = await prisma.user.findUnique({
          where: { username: username.toString().trim() },
        });

        if (existingUser) {
          console.log(`⏭️  ${username} already exists, skipping...`);
          skipCount++;
          continue;
        }

        // Hash the password
        const hashedPassword = await hashPassword(password.toString());

        // Create admin user (no team association)
        await prisma.user.create({
          data: {
            username: username.toString().trim(),
            password: hashedPassword,
            role: 'ADMIN',
            teamId: null, // Admins don't have teams
          },
        });

        console.log(`✅ ${username} - Admin created successfully`);
        successCount++;

      } catch (rowError) {
        console.error(`❌ Error processing admin:`, rowError.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Import Summary:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importAdmins();
