/**
 * Comprehensive Test Script for New Features
 * Tests both Email Notifications and Debt Amortization systems
 */

const API_BASE = 'http://localhost:3001/api';

class FeaturesTester {
  constructor() {
    this.sessionCookie = null;
    this.testResults = [];
  }

  // Helper method to make authenticated requests
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

    // Capture session cookie from response
    if (response.headers.get('set-cookie')) {
      this.sessionCookie = response.headers.get('set-cookie');
    }

    return response;
  }

  // Test helper
  test(name, passed, details = '') {
    const result = { name, passed, details };
    this.testResults.push(result);
    console.log(`${passed ? '✅' : '❌'} ${name}${details ? ': ' + details : ''}`);
    return passed;
  }

  // Register a new test user
  async createTestUser() {
    console.log('\n🧪 Testing User Registration...');
    
    const testUser = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'test123456'
      // familyId omitted = create new family (becomes admin)
    };

    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
      });

      const data = await response.json();
      
      if (response.ok) {
        this.test('User Registration', true, 'New admin user created');
        this.testUser = testUser;
        return true;
      } else {
        this.test('User Registration', false, data.error || 'Failed to register');
        return false;
      }
    } catch (error) {
      this.test('User Registration', false, error.message);
      return false;
    }
  }

  // Login with test user
  async loginTestUser() {
    console.log('\n🔐 Testing User Login...');
    
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: this.testUser.email,
          password: this.testUser.password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.test('User Login', true, 'Admin authenticated successfully');
        return true;
      } else {
        this.test('User Login', false, data.error || 'Login failed');
        return false;
      }
    } catch (error) {
      this.test('User Login', false, error.message);
      return false;
    }
  }

  // Test Email Notifications API
  async testEmailNotifications() {
    console.log('\n📧 Testing Email Notifications System...');

    // Test 1: Get current notification settings
    try {
      const response = await this.makeRequest('/admin/notifications/config');
      const passed = response.ok;
      this.test('Get Notification Config', passed, 
        passed ? 'Config endpoint accessible' : `Status: ${response.status}`);
    } catch (error) {
      this.test('Get Notification Config', false, error.message);
    }

    // Test 2: Update notification settings
    try {
      const config = {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'test@example.com',
        smtpPass: 'testpassword',
        enabled: true,
        day: 'sunday',
        time: '09:00',
        timezone: 'UTC',
        includeCharts: false,
        customMessage: 'Test message'
      };

      const response = await this.makeRequest('/admin/notifications/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });

      const passed = response.ok;
      this.test('Save Notification Config', passed, 
        passed ? 'SMTP settings saved' : `Status: ${response.status}`);
    } catch (error) {
      this.test('Save Notification Config', false, error.message);
    }

    // Test 3: Test email sending (will fail without real SMTP but should return proper error)
    try {
      const response = await this.makeRequest('/admin/notifications/test', {
        method: 'POST',
        body: JSON.stringify({ testEmail: 'test@example.com' })
      });

      // Even if email fails, API should respond properly
      const data = await response.json();
      const passed = response.status !== 500; // Should handle gracefully
      this.test('Email Test Endpoint', passed, 
        passed ? 'Test endpoint functional' : 'Server error');
    } catch (error) {
      this.test('Email Test Endpoint', false, error.message);
    }

    // Test 4: Get notification history
    try {
      const response = await this.makeRequest('/admin/notifications/history');
      const passed = response.ok;
      this.test('Notification History', passed, 
        passed ? 'History endpoint accessible' : `Status: ${response.status}`);
    } catch (error) {
      this.test('Notification History', false, error.message);
    }
  }

  // Test Debt Amortization System
  async testDebtAmortization() {
    console.log('\n💰 Testing Debt Amortization System...');

    const testDebtAccount = {
      name: 'Test Mortgage',
      category: 'Debt',
      currency: 'EUR',
      iban: '', // Optional for debt accounts
      notes: 'Test mortgage for amortization',
      // Amortization fields
      aprRate: 0.035, // 3.5% APR
      originalBalance: 300000, // €300,000 loan
      loanTermMonths: 360, // 30 years
      monthlyPayment: 1500, // €1,500/month
      paymentType: 'fixed',
      autoUpdateEnabled: true,
      loanStartDate: '2024-01-01'
    };

    let accountId = null;

    // Test 1: Create debt account
    try {
      const response = await this.makeRequest('/accounts', {
        method: 'POST',
        body: JSON.stringify(testDebtAccount)
      });

      const data = await response.json();
      
      if (response.ok) {
        accountId = data.accountId;
        this.test('Create Debt Account', true, `Account ID: ${accountId}`);
        
        // Verify account was created with amortization fields
        const accountsResponse = await this.makeRequest('/accounts');
        const accounts = await accountsResponse.json();
        const createdAccount = accounts.find(acc => acc.id === accountId);
        
        if (createdAccount && createdAccount.apr_rate === testDebtAccount.aprRate) {
          this.test('Debt Account Fields', true, 'Amortization fields saved correctly');
        } else {
          this.test('Debt Account Fields', false, 'Amortization fields missing or incorrect');
        }
      } else {
        this.test('Create Debt Account', false, data.error || 'Account creation failed');
        return;
      }
    } catch (error) {
      this.test('Create Debt Account', false, error.message);
      return;
    }

    // Test 2: Get amortization schedule
    try {
      const response = await this.makeRequest(`/accounts/${accountId}/amortization`);
      const data = await response.json();
      
      if (response.ok && data.schedule) {
        this.test('Amortization Schedule', true, `${data.schedule.payments.length} payments calculated`);
        
        // Verify calculations
        const schedule = data.schedule;
        const expectedMonthlyRate = testDebtAccount.aprRate / 12;
        const actualMonthlyRate = schedule.monthlyInterestRate;
        
        const rateCorrect = Math.abs(expectedMonthlyRate - actualMonthlyRate) < 0.0001;
        this.test('Interest Rate Calculation', rateCorrect, 
          `Expected: ${expectedMonthlyRate.toFixed(6)}, Got: ${actualMonthlyRate.toFixed(6)}`);
        
        // Test first payment calculation
        const firstPayment = schedule.payments[0];
        const expectedFirstInterest = testDebtAccount.originalBalance * expectedMonthlyRate;
        const interestCorrect = Math.abs(firstPayment.interestPayment - expectedFirstInterest) < 1;
        
        this.test('First Payment Interest', interestCorrect, 
          `Expected: €${expectedFirstInterest.toFixed(2)}, Got: €${firstPayment.interestPayment.toFixed(2)}`);
        
        // Test total interest calculation
        const totalInterestReasonable = schedule.totalInterest > 100000 && schedule.totalInterest < 400000;
        this.test('Total Interest Calculation', totalInterestReasonable, 
          `Total interest: €${schedule.totalInterest.toFixed(2)}`);
      } else {
        this.test('Amortization Schedule', false, data.error || 'Failed to get schedule');
      }
    } catch (error) {
      this.test('Amortization Schedule', false, error.message);
    }

    // Test 3: Record a payment
    try {
      const paymentData = {
        amount: 1500,
        date: '2024-02-01',
        paymentType: 'mixed',
        notes: 'Test payment'
      };

      const response = await this.makeRequest(`/accounts/${accountId}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();
      
      if (response.ok) {
        this.test('Record Payment', true, 
          `Principal: €${data.principalPaid}, Interest: €${data.interestPaid}`);
        
        // Verify payment breakdown is reasonable
        const totalCorrect = Math.abs((data.principalPaid + data.interestPaid) - paymentData.amount) < 0.01;
        this.test('Payment Breakdown', totalCorrect, 'Principal + Interest = Total Payment');
      } else {
        this.test('Record Payment', false, data.error || 'Payment recording failed');
      }
    } catch (error) {
      this.test('Record Payment', false, error.message);
    }

    // Test 4: Apply monthly update
    try {
      const response = await this.makeRequest(`/accounts/${accountId}/amortization`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (response.ok) {
        this.test('Monthly Update', data.success, 
          data.success ? `New balance: €${data.newBalance}, Interest: €${data.interestAdded}` : data.error);
      } else {
        this.test('Monthly Update', false, data.error || 'Monthly update failed');
      }
    } catch (error) {
      this.test('Monthly Update', false, error.message);
    }

    // Test 5: Get debt summaries
    try {
      const response = await this.makeRequest('/debts/summary');
      const data = await response.json();
      
      if (response.ok && data.summaries) {
        const summaryFound = data.summaries.some(s => s.accountId === accountId);
        this.test('Debt Summary', summaryFound, `${data.summaries.length} debt accounts found`);
      } else {
        this.test('Debt Summary', false, 'Failed to get debt summaries');
      }
    } catch (error) {
      this.test('Debt Summary', false, error.message);
    }
  }

  // Test Dashboard Integration
  async testDashboardIntegration() {
    console.log('\n📊 Testing Dashboard Integration...');

    try {
      const response = await this.makeRequest('/dashboard');
      const data = await response.json();
      
      if (response.ok) {
        const hasDebtData = data.total_debt !== undefined;
        this.test('Dashboard Debt Tracking', hasDebtData, 
          hasDebtData ? `Total debt: €${data.total_debt}` : 'Debt data missing');
        
        const hasNetWorth = data.net_worth !== undefined;
        this.test('Net Worth Calculation', hasNetWorth, 
          hasNetWorth ? `Net worth: €${data.net_worth}` : 'Net worth missing');
      } else {
        this.test('Dashboard Integration', false, 'Dashboard API failed');
      }
    } catch (error) {
      this.test('Dashboard Integration', false, error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Feature Testing...\n');
    console.log('Testing Server: http://localhost:3001\n');

    const userCreated = await this.createTestUser();
    if (!userCreated) return this.printResults();

    const loginSuccessful = await this.loginTestUser();
    if (!loginSuccessful) return this.printResults();

    await this.testEmailNotifications();
    await this.testDebtAmortization();
    await this.testDashboardIntegration();

    this.printResults();
  }

  // Print final results
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log(`\n📊 Overall Results: ${passed}/${total} tests passed (${percentage}%)\n`);
    
    // Group by category
    const categories = {
      'User Management': this.testResults.filter(r => r.name.includes('User')),
      'Email Notifications': this.testResults.filter(r => r.name.includes('Notification') || r.name.includes('Email')),
      'Debt Amortization': this.testResults.filter(r => r.name.includes('Debt') || r.name.includes('Amortization') || r.name.includes('Payment')),
      'Dashboard Integration': this.testResults.filter(r => r.name.includes('Dashboard'))
    };

    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const categoryPassed = tests.filter(t => t.passed).length;
        console.log(`\n${category}: ${categoryPassed}/${tests.length} ✅`);
        tests.forEach(test => {
          console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
          if (test.details) {
            console.log(`      ${test.details}`);
          }
        });
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(percentage >= 80 ? '🎉 TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
    console.log('='.repeat(60));
  }
}

// Run the tests
const tester = new FeaturesTester();
tester.runAllTests().catch(console.error);