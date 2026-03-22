// Test using the exact import from the application
async function testAppClient() {
  // Import the same way the app does
  const { default: createExtendedPrismaClient } = await import('./src/lib/db.js');

  try {
    console.log('Testing with app\'s extended client...');

    const email = 'dev.admin@smartunion.local';

    // Test without any deletedAt condition - let middleware handle it
    console.log('\n1. Using findFirst without deletedAt (middleware should handle):');
    const user = await createExtendedPrismaClient.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (user) {
      console.log('✓ User found with extended client');
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Status: ${user.status}`);
    } else {
      console.log('❌ User not found with extended client');
    }

  } catch (error) {
    console.error('❌ Error:', error);

    // If import fails, try require approach
    console.log('\nTrying require approach...');
    try {
      const { prisma } = require('./src/lib/db.ts');

      const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase() }
      });

      console.log(`Require result: ${user ? 'Found user' : 'No user'}`);
    } catch (requireError) {
      console.error('❌ Require also failed:', requireError.message);
    }
  }
}

testAppClient().catch(console.error);