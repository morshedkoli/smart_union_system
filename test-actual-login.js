// Test the exact login flow as used in the API
const { AuthService } = require('./dist/services/auth.service.js');

async function testActualLogin() {
  try {
    console.log('Testing actual AuthService.login flow...');

    const email = 'dev.admin@smartunion.local';
    const password = 'Dev@12345';

    console.log(`\nAttempting login with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);

    const result = await AuthService.login(email, password, '127.0.0.1', 'test-user-agent');

    console.log(`\nResult:`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Message: ${result.message}`);

    if (result.success) {
      console.log(`  User: ${result.user?.name} (${result.user?.email})`);
      console.log(`  Token: ${result.token ? 'Present' : 'Missing'}`);
      console.log('🎉 LOGIN SUCCESSFUL!');
    } else {
      console.log('❌ Login failed');
    }

  } catch (error) {
    console.error('❌ Error during login test:', error);

    // If the compiled version fails, let's try to understand why
    console.log('\nError details:');
    console.log(`  Name: ${error.name}`);
    console.log(`  Message: ${error.message}`);
    if (error.stack) {
      console.log(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }
}

testActualLogin().catch(console.error);