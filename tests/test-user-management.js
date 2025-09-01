/**
 * Test script for User Management functionality
 */

const API_BASE = 'http://localhost:3000/api';

class UserManagementTester {
  constructor() {
    this.sessionCookie = null;
    this.testResults = [];
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

  async createTestAdmin() {
    console.log('\n🧪 Setting up test admin...');
    
    const testUser = {
      name: 'Admin User',
      email: `admin${Date.now()}@test.com`,
      password: 'adminpass123'
    };

    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
      });

      const data = await response.json();
      
      if (response.ok) {
        this.test('Admin Registration', true, 'Test admin created');
        this.testAdmin = testUser;
        return true;
      } else {
        this.test('Admin Registration', false, data.error || 'Registration failed');
        return false;
      }
    } catch (error) {
      this.test('Admin Registration', false, error.message);
      return false;
    }
  }

  async loginAdmin() {
    console.log('\n🔐 Logging in as admin...');
    
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: this.testAdmin.email,
          password: this.testAdmin.password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.test('Admin Login', true, 'Admin authenticated');
        return true;
      } else {
        this.test('Admin Login', false, data.error || 'Login failed');
        return false;
      }
    } catch (error) {
      this.test('Admin Login', false, error.message);
      return false;
    }
  }

  async testUserAPIs() {
    console.log('\n👥 Testing User Management APIs...');

    // Test 1: Get users list
    try {
      const response = await this.makeRequest('/admin/users');
      const passed = response.ok;
      this.test('Get Users List', passed, 
        passed ? 'Users endpoint accessible' : `Status: ${response.status}`);
      
      if (passed) {
        const data = await response.json();
        this.test('Users Data Structure', data.users && Array.isArray(data.users), 
          `Found ${data.users?.length || 0} users`);
      }
    } catch (error) {
      this.test('Get Users List', false, error.message);
    }

    // Test 2: Create new user
    try {
      const newUser = {
        name: 'Test User',
        email: `testuser${Date.now()}@test.com`,
        password: 'userpass123',
        role: 'user'
      };

      const response = await this.makeRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });

      const data = await response.json();
      const passed = response.ok;
      
      this.test('Create User', passed, 
        passed ? `User created with ID: ${data.userId}` : `Error: ${data.error}`);
      
      if (passed) {
        this.createdUserId = data.userId;
      }
    } catch (error) {
      this.test('Create User', false, error.message);
    }

    // Test 3: Update user (if create succeeded)
    if (this.createdUserId) {
      try {
        const updateData = {
          id: this.createdUserId,
          name: 'Updated Test User',
          role: 'guest'
        };

        const response = await this.makeRequest(`/admin/users/${this.createdUserId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const data = await response.json();
        const passed = response.ok;
        
        this.test('Update User', passed, 
          passed ? 'User updated successfully' : `Error: ${data.error}`);
      } catch (error) {
        this.test('Update User', false, error.message);
      }
    }

    // Test 4: Get individual user
    if (this.createdUserId) {
      try {
        const response = await this.makeRequest(`/admin/users/${this.createdUserId}`);
        const data = await response.json();
        const passed = response.ok;
        
        this.test('Get Individual User', passed, 
          passed ? `Retrieved: ${data.user?.name}` : `Error: ${data.error}`);
      } catch (error) {
        this.test('Get Individual User', false, error.message);
      }
    }

    // Test 5: Delete user (if create succeeded)
    if (this.createdUserId) {
      try {
        const response = await this.makeRequest(`/admin/users/${this.createdUserId}`, {
          method: 'DELETE'
        });

        const data = await response.json();
        const passed = response.ok;
        
        this.test('Delete User', passed, 
          passed ? 'User deleted successfully' : `Error: ${data.error}`);
      } catch (error) {
        this.test('Delete User', false, error.message);
      }
    }

    // Test 6: Test security - non-admin access
    try {
      // First logout
      await this.makeRequest('/auth/logout', { method: 'POST' });
      this.sessionCookie = null;

      // Try to access admin endpoint without auth
      const response = await this.makeRequest('/admin/users');
      const passed = response.status === 401;
      
      this.test('Security - Unauthorized Access', passed, 
        passed ? 'Properly blocked unauthorized access' : 'Security vulnerability!');
    } catch (error) {
      this.test('Security - Unauthorized Access', false, error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting User Management Testing...\n');
    console.log('Testing Server: http://localhost:3000\n');

    const adminCreated = await this.createTestAdmin();
    if (!adminCreated) return this.printResults();

    const loginSuccessful = await this.loginAdmin();
    if (!loginSuccessful) return this.printResults();

    await this.testUserAPIs();

    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 USER MANAGEMENT TEST RESULTS');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log(`\n📊 Overall Results: ${passed}/${total} tests passed (${percentage}%)\n`);
    
    this.testResults.forEach(test => {
      console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
      if (test.details) {
        console.log(`    ${test.details}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(percentage >= 90 ? '🎉 TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
    console.log('='.repeat(60));
  }
}

// Run the tests
const tester = new UserManagementTester();
tester.runAllTests().catch(console.error);