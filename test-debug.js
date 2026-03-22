const { PrismaClient } = require('@prisma/client');

async function debugUserLookup() {
  const prisma = new PrismaClient();

  try {
    console.log('Debugging user lookup...');

    const email = 'dev.admin@smartunion.local';

    // Test 1: Find all users with that email (ignore soft delete)
    console.log(`\n1. Finding all users with email: ${email}`);
    const allUsers = await prisma.user.findMany({
      where: {
        email: email.toLowerCase(),
      },
    });
    console.log(`Found ${allUsers.length} users (ignoring soft delete)`);
    allUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, deletedAt: ${user.deletedAt}, status: ${user.status}`);
    });

    // Test 2: Find with explicit deletedAt: null
    console.log(`\n2. Finding users with explicit deletedAt: null`);
    const activeUsers = await prisma.user.findMany({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });
    console.log(`Found ${activeUsers.length} active users`);

    // Test 3: Find first user (this should use the soft delete middleware)
    console.log(`\n3. Using findFirst (should use soft delete middleware)`);
    try {
      const firstUser = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
        },
      });
      console.log(`findFirst result: ${firstUser ? 'Found user' : 'No user found'}`);
      if (firstUser) {
        console.log(`  - User: ${firstUser.name}, deletedAt: ${firstUser.deletedAt}`);
      }
    } catch (error) {
      console.log(`findFirst error: ${error.message}`);
    }

    // Test 4: Check if there are any users with different email case
    console.log(`\n4. Checking for case sensitivity issues`);
    const allDevUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'smartunion.local'
        }
      },
    });
    console.log(`All dev users found:`);
    allDevUsers.forEach(user => {
      console.log(`  - ${user.email} (deletedAt: ${user.deletedAt})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserLookup().catch(console.error);