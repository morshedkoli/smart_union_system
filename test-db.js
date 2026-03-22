const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing database connection...');

    // Test connection
    await prisma.$connect();
    console.log('✓ Database connection successful');

    // Check if dev users exist
    console.log('\nChecking for dev users...');
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: '@smartunion.local'
        }
      }
    });

    console.log(`Found ${users.length} dev users:`);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}, Status: ${user.status}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️ No dev users found! This explains the login 401 error.');
      console.log('The ensureDevelopmentUsers function may not have created the users properly.');
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase().catch(console.error);