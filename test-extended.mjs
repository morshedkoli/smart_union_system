// Import the extended client exactly as used in the application
import { prisma } from './src/lib/db.js';

async function testExtendedClient() {
  try {
    console.log('Testing with extended Prisma client...');

    const email = 'dev.admin@smartunion.local';

    // Test the exact same query as used in AuthService.login
    console.log(`\nTesting AuthService.login query...`);
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (user) {
      console.log('✓ User found with extended client');
      console.log(`  - Name: ${user.name}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Status: ${user.status}`);
      console.log(`  - deletedAt: ${user.deletedAt}`);
      console.log(`  - deletedAt type: ${typeof user.deletedAt}`);
      console.log(`  - deletedAt === null: ${user.deletedAt === null}`);
      console.log(`  - deletedAt == null: ${user.deletedAt == null}`);
    } else {
      console.log('❌ User not found with extended client');

      // Try without explicit deletedAt filter
      console.log('\nTrying without explicit deletedAt filter...');
      const userWithoutFilter = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
        },
      });

      if (userWithoutFilter) {
        console.log('✓ User found without deletedAt filter');
        console.log(`  - deletedAt: ${userWithoutFilter.deletedAt}`);
        console.log(`  - deletedAt type: ${typeof userWithoutFilter.deletedAt}`);
      } else {
        console.log('❌ User still not found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testExtendedClient().catch(console.error);