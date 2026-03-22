// Test raw queries to understand the issue
const { PrismaClient } = require('@prisma/client');

async function investigateDeletedAtIssue() {
  const prisma = new PrismaClient();

  try {
    console.log('Investigating deletedAt field...');

    // Get one user and examine its deletedAt field closely
    const email = 'dev.admin@smartunion.local';

    console.log('\n1. Raw query to examine deletedAt field:');
    const rawUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (rawUser) {
      console.log('Raw user data:');
      console.log(`  - deletedAt: ${rawUser.deletedAt}`);
      console.log(`  - deletedAt type: ${typeof rawUser.deletedAt}`);
      console.log(`  - deletedAt === null: ${rawUser.deletedAt === null}`);
      console.log(`  - deletedAt === undefined: ${rawUser.deletedAt === undefined}`);
      console.log(`  - JSON.stringify(deletedAt): ${JSON.stringify(rawUser.deletedAt)}`);
    }

    // Test different conditions
    console.log('\n2. Testing different where conditions:');

    const tests = [
      { name: 'deletedAt: null', where: { email: email.toLowerCase(), deletedAt: null } },
      { name: 'deletedAt: undefined', where: { email: email.toLowerCase(), deletedAt: undefined } },
      { name: 'no deletedAt filter', where: { email: email.toLowerCase() } },
    ];

    for (const test of tests) {
      try {
        const result = await prisma.user.findFirst({ where: test.where });
        console.log(`  ✓ ${test.name}: ${result ? 'Found user' : 'No user'}`);
      } catch (error) {
        console.log(`  ❌ ${test.name}: Error - ${error.message}`);
      }
    }

    // Check if this is a MongoDB vs SQL difference
    console.log('\n3. Checking schema and database type...');
    console.log('DATABASE_URL from env:', process.env.DATABASE_URL?.includes('mongodb') ? 'MongoDB' : 'SQL');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateDeletedAtIssue().catch(console.error);