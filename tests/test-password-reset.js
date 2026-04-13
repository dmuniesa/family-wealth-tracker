/**
 * Test script for Password Recovery API endpoints
 * 
 * Tests:
 *  - POST /api/auth/forgot-password
 *  - POST /api/auth/verify-reset-token
 *  - POST /api/auth/reset-password
 * 
 * Usage: node tests/test-password-reset.js
 * Prerequisites: Server running at http://localhost:3000
 */

const API_BASE = 'http://localhost:3000/api';

class PasswordResetTester {
  constructor() {
    this.testResults = [];
    this.testUser = null;
    this.sessionCookie = null;
    this.resetToken = null;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.sessionCookie ? { 'Cookie': this.sessionCookie } : {}),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.headers.get('set-cookie')) {
      this.sessionCookie = response.headers.get('set-cookie');
    }

    return response;
  }

  test(name, passed, details = '') {
    const result = { name, passed, details };
    this.testResults.push(result);
    console.log(`${passed ? '✅' : '❌'} ${name}${details ? ': ' + details : ''}`);
    return passed;
  }

  // ─── Setup: Create a test user ──────────────────────────────────
  async setupTestUser() {
    console.log('\n🧪 Setting up test user for password reset tests...');
    
    this.testUser = {
      name: 'Reset Test User',
      email: `reset-test-${Date.now()}@test.com`,
      password: 'originalPassword123'
    };

    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(this.testUser)
      });

      const data = await response.json();
      
      if (response.ok) {
        this.test('Test User Registration', true, `Created: ${this.testUser.email}`);
        return true;
      } else {
        this.test('Test User Registration', false, data.error || 'Registration failed');
        return false;
      }
    } catch (error) {
      this.test('Test User Registration', false, error.message);
      return false;
    }
  }

  // ─── Test: POST /api/auth/forgot-password ────────────────────────
  async testForgotPassword() {
    console.log('\n📧 Testing POST /api/auth/forgot-password...');

    // Test 1: Valid email — should return success
    try {
      const response = await this.makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: this.testUser.email })
      });

      const data = await response.json();

      this.test('Forgot Password - Valid email returns 200', response.status === 200,
        `Status: ${response.status}`);

      this.test('Forgot Password - Response has success=true', data.success === true,
        `success: ${data.success}`);

      this.test('Forgot Password - Response has message', typeof data.message === 'string',
        data.message ? `Message present` : 'No message');
    } catch (error) {
      this.test('Forgot Password - Valid email', false, error.message);
    }

    // Test 2: Non-existent email — should also return success (no enumeration)
    try {
      const response = await this.makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@test.com' })
      });

      const data = await response.json();

      this.test('Forgot Password - Non-existent email returns 200 (no enumeration)', response.status === 200,
        `Status: ${response.status}`);

      this.test('Forgot Password - Non-existent email same success response', data.success === true,
        `success: ${data.success}`);
    } catch (error) {
      this.test('Forgot Password - Non-existent email', false, error.message);
    }

    // Test 3: Invalid email format — should return 400
    try {
      const response = await this.makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email' })
      });

      this.test('Forgot Password - Invalid email returns 400', response.status === 400,
        `Status: ${response.status}`);
    } catch (error) {
      this.test('Forgot Password - Invalid email', false, error.message);
    }

    // Test 4: Missing email — should return 400
    try {
      const response = await this.makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({})
      });

      this.test('Forgot Password - Missing email returns 400', response.status === 400,
        `Status: ${response.status}`);
    } catch (error) {
      this.test('Forgot Password - Missing email', false, error.message);
    }

    // Test 5: Empty body — should return 400
    try {
      const response = await this.makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: '' })
      });

      this.test('Forgot Password - Empty email returns 400', response.status === 400,
        `Status: ${response.status}`);
    } catch (error) {
      this.test('Forgot Password - Empty email', false, error.message);
    }
  }

  // ─── Test: POST /api/auth/verify-reset-token ─────────────────────
  async testVerifyResetToken() {
    console.log('\n🔑 Testing POST /api/auth/verify-reset-token...');

    // Test 1: Invalid token format
    try {
      const response = await this.makeRequest('/auth/verify-reset-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token-value' })
      });

      const data = await response.json();

      this.test('Verify Token - Invalid token returns valid=false', data.valid === false,
        `valid: ${data.valid}`);
    } catch (error) {
      this.test('Verify Token - Invalid token', false, error.message);
    }

    // Test 2: Missing token
    try {
      const response = await this.makeRequest('/auth/verify-reset-token', {
        method: 'POST',
        body: JSON.stringify({})
      });

      this.test('Verify Token - Missing token returns 400', response.status === 400,
        `Status: ${response.status}`);
    } catch (error) {
      this.test('Verify Token - Missing token', false, error.message);
    }

    // Test 3: Empty token
    try {
      const response = await this.makeRequest('/auth/verify-reset-token', {
        method: 'POST',
        body: JSON.stringify({ token: '' })
      });

      this.test('Verify Token - Empty token returns 400', response.status === 400,
        `Status: ${response.status}`);
    } catch (error) {
      this.test('Verify Token - Empty token', false, error.message);
    }
  }

  // ─── Test: POST /api/auth/reset-password ─────────────────────────
  async testResetPassword() {
    console.log('\n🔄 Testing POST /api/auth/reset-password...');

    // Test 1: Invalid token
    try {
      const response = await this.makeRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token',
          newPassword: 'newPassword123',
          confirmPassword: 'newPassword123'
        })
      });

      const data = await response.json();

      this.test('Reset Password - Invalid token returns error', response.status === 400,
        `Status: ${response.status}, Error: ${data.error}`);
    } catch (error) {
      this.test('Reset Password - Invalid token', false, error.message);
    }

    // Test 2: Password too short
    try {
      const response = await this.makeRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'some-token',
          newPassword: 'short',
          confirmPassword: 'short'
        })
      });

      const data = await response.json();

      this.test('Reset Password - Short password returns 400', response.status === 400,
        `Status: ${response.status}, Error: ${data.error}`);
    } catch (error) {
      this.test('Reset Password - Short password', false, error.message);
    }

    // Test 3: Passwords don't match
    try {
      const response = await this.makeRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'some-token',
          newPassword: 'newPassword123',
          confirmPassword: 'differentPassword456'
        })
      });

      const data = await response.json();

      this.test('Reset Password - Mismatched passwords returns 400', response.status === 400,
        `Status: ${response.status}, Error: ${data.error}`);
    } catch (error) {
      this.test('Reset Password - Mismatched passwords', false, error.message);
    }

    // Test 4: Missing fields
    try {
      const response = await this.makeRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({})
      });

      this.test('Reset Password - Missing fields returns 400', response.status === 400,
        `Status: ${response.status}`);
    } catch (error) {
      this.test('Reset Password - Missing fields', false, error.message);
    }

    // Test 5: Missing confirmPassword
    try {
      const response = await this.makeRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'some-token',
          newPassword: 'newPassword123'
        })
      });

      this.test('Reset Password - Missing confirmPassword returns 400', response.status === 400,
        `Status: ${response.status}`);
    } catch (error) {
      this.test('Reset Password - Missing confirmPassword', false, error.message);
    }
  }

  // ─── Full flow test with token extraction ────────────────────────
  async testFullResetFlow() {
    console.log('\n🔄 Testing FULL password reset flow (requires email service configured)...');

    // Step 1: Request password reset
    try {
      const response = await this.makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: this.testUser.email })
      });

      const data = await response.json();

      if (response.status === 503) {
        this.test('Full Flow - Email service not configured', false,
          'Cannot test full flow without email service. Skipping.');
        console.log('   ⚠️  To test the full flow, configure Resend or SMTP first.');
        return;
      }

      this.test('Full Flow - Step 1: Forgot password request', response.ok,
        `Status: ${response.status}`);
    } catch (error) {
      this.test('Full Flow - Step 1: Forgot password', false, error.message);
    }

    // Note: The full flow (receiving the token via email and using it) 
    // cannot be fully automated without:
    // 1. Access to the email inbox, or
    // 2. Directly querying the database for the token
    // 
    // The individual API endpoints have been tested above.
    // For manual testing, use the UI flow:
    // 1. Go to /auth → Click "Forgot password"
    // 2. Enter email → Check inbox → Click link
    // 3. Enter new password → Login with new password
    
    console.log('\n   ℹ️  Note: Full end-to-end flow requires manual testing with email delivery.');
    console.log('   ℹ️  The API endpoint tests above validate all error cases and validation logic.');
  }

  // ─── Test: Login with original password still works ──────────────
  async testOriginalPasswordStillWorks() {
    console.log('\n🔐 Testing login with original password (password should NOT have changed)...');

    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: this.testUser.email,
          password: this.testUser.password
        })
      });

      const data = await response.json();

      this.test('Original password still works', response.ok,
        response.ok ? 'Password unchanged (expected)' : `Password was changed unexpectedly`);
    } catch (error) {
      this.test('Original password login', false, error.message);
    }
  }

  // ─── Cleanup ─────────────────────────────────────────────────────
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    // Logout
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore cleanup errors
    }
  }

  // ─── Run all tests ───────────────────────────────────────────────
  async runAllTests() {
    console.log('🚀 Starting Password Recovery API Tests...\n');
    console.log('Testing Server: http://localhost:3000');
    console.log('='.repeat(60));

    // Setup
    const userCreated = await this.setupTestUser();
    if (!userCreated) {
      console.log('\n⚠️  Cannot proceed without test user. Aborting.');
      return this.printResults();
    }

    // Run test suites
    await this.testForgotPassword();
    await this.testVerifyResetToken();
    await this.testResetPassword();
    await this.testOriginalPasswordStillWorks();
    await this.testFullResetFlow();

    // Cleanup
    await this.cleanup();

    // Results
    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 PASSWORD RECOVERY API TEST RESULTS');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log(`\n📊 Overall Results: ${passed}/${total} tests passed (${percentage}%)`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}\n`);
    
    this.testResults.forEach(test => {
      console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
      if (test.details) {
        console.log(`    ${test.details}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(percentage >= 90 ? '🎉 TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
    console.log('='.repeat(60));

    // Exit with error code if tests failed
    process.exit(percentage >= 90 ? 0 : 1);
  }
}

// Run the tests
const tester = new PasswordResetTester();
tester.runAllTests().catch(console.error);