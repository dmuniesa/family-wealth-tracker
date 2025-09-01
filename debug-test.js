// Quick debug test for debt account creation

async function debugTest() {
  console.log('🔍 Debug Test: Creating debt account...\n');
  
  // First, we need to login
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'djmuniesa@gmail.com', // Use existing user
      password: 'tu_contraseña_aqui' // You'll need to provide the real password
    })
  });

  if (!loginResponse.ok) {
    console.log('❌ Login failed - please use the browser to test manually');
    return;
  }

  const cookies = loginResponse.headers.get('set-cookie');
  console.log('✅ Logged in successfully');

  // Now create a debt account
  const debtAccount = {
    name: 'Debug Test Mortgage',
    category: 'Debt',
    currency: 'EUR',
    notes: 'Test debt for debugging',
    aprRate: 0.035,
    originalBalance: 250000,
    loanTermMonths: 300,
    monthlyPayment: 1200,
    paymentType: 'fixed',
    autoUpdateEnabled: true,
    loanStartDate: '2024-01-01'
  };

  console.log('Creating account with data:', debtAccount);

  const createResponse = await fetch('http://localhost:3000/api/accounts', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies 
    },
    body: JSON.stringify(debtAccount)
  });

  const createData = await createResponse.json();
  console.log('\nCreate Response Status:', createResponse.status);
  console.log('Create Response Data:', createData);

  if (createResponse.ok && createData.accountId) {
    console.log(`\n✅ Account created with ID: ${createData.accountId}`);
    
    // Test amortization schedule
    const scheduleResponse = await fetch(`http://localhost:3000/api/accounts/${createData.accountId}/amortization`, {
      headers: { 'Cookie': cookies }
    });
    
    const scheduleData = await scheduleResponse.json();
    console.log('\nAmortization Schedule Response Status:', scheduleResponse.status);
    console.log('Schedule Data Keys:', Object.keys(scheduleData));
    
    if (scheduleData.schedule) {
      console.log(`✅ Schedule generated: ${scheduleData.schedule.payments.length} payments`);
      console.log(`✅ Total Interest: €${scheduleData.schedule.totalInterest.toFixed(2)}`);
      console.log(`✅ Monthly Payment: €${scheduleData.schedule.monthlyPayment.toFixed(2)}`);
      
      // Show first few payments
      console.log('\nFirst 3 Payments:');
      scheduleData.schedule.payments.slice(0, 3).forEach((payment, index) => {
        console.log(`  ${index + 1}. Principal: €${payment.principalPayment.toFixed(2)}, Interest: €${payment.interestPayment.toFixed(2)}, Balance: €${payment.remainingBalance.toFixed(2)}`);
      });
    }
  } else {
    console.log('❌ Account creation failed');
  }
}

console.log('Please update the email/password in the script and run again.');
console.log('Or use the existing logged-in session from your browser.\n');