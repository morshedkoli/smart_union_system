const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testLogin() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing login process...');

    const email = 'dev.admin@smartunion.local';
    const password = 'Dev@12345';

    // Find user by email (case insensitive)
    console.log(`\nLooking up user: ${email}`);
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✓ User found: ${user.name} (${user.email})`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Password hash: ${user.password.substring(0, 20)}...`);

    // Check if status is active
    if (user.status !== 'ACTIVE') {
      console.log(`❌ User status is not ACTIVE: ${user.status}`);
      return;
    }

    console.log('✓ User status is ACTIVE');

    // Test password verification
    console.log(`\nTesting password verification...`);
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log('✓ Password verification successful');
      console.log('🎉 Login should work! The issue might be elsewhere.');
    } else {
      console.log('❌ Password verification failed');
      console.log('This explains the 401 error - password hash doesn\'t match');

      // Test with fresh hash
      console.log('\nTesting fresh hash creation...');
      const freshHash = await bcrypt.hash(password, 12);
      const freshVerify = await bcrypt.compare(password, freshHash);
      console.log(`Fresh hash verification: ${freshVerify ? '✓' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin().catch(console.error);