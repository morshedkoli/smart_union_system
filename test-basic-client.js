// Test with a basic client without extensions
const { PrismaClient } = require('@prisma/client');

async function testWithoutExtensions() {
  const basicClient = new PrismaClient();

  try {
    console.log('Testing with basic Prisma client (no extensions)...');

    const email = 'dev.admin@smartunion.local';

    // Test 1: Basic findFirst
    console.log('\n1. Basic findFirst:');
    const user1 = await basicClient.user.findFirst({
      where: { email: email.toLowerCase() }
    });
    console.log(`Result: ${user1 ? 'Found user' : 'No user'}`);

    // Test 2: With explicit deletedAt: null
    console.log('\n2. With deletedAt: null:');
    const user2 = await basicClient.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null
      }
    });
    console.log(`Result: ${user2 ? 'Found user' : 'No user'}`);

    // Test 3: Check what values deletedAt actually has
    console.log('\n3. Checking deletedAt values:');
    const allUsers = await basicClient.user.findMany({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, deletedAt: true }
    });

    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach((user, index) => {
      console.log(`  User ${index + 1}:`);
      console.log(`    deletedAt: ${user.deletedAt}`);
      console.log(`    typeof deletedAt: ${typeof user.deletedAt}`);
      console.log(`    deletedAt === null: ${user.deletedAt === null}`);
      console.log(`    deletedAt == null: ${user.deletedAt == null}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await basicClient.$disconnect();
  }
}

testWithoutExtensions().catch(console.error);