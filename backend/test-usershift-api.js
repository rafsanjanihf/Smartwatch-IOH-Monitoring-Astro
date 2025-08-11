// Test script untuk UserShift API
// Jalankan dengan: node test-usershift-api.js

const BASE_URL = 'http://localhost:3031/api';

async function testAPI() {
  console.log('🧪 Testing UserShift API...\n');

  try {
    // Test 1: Get all user shifts
    console.log('1️⃣ Testing GET /user-shifts');
    const response1 = await fetch(`${BASE_URL}/user-shifts`);
    const data1 = await response1.json();
    console.log('✅ Status:', response1.status);
    console.log('📊 Data count:', Array.isArray(data1) ? data1.length : 'Not array');
    console.log('📄 Sample data:', data1.slice(0, 2));
    console.log('');

    // Test 2: Get user shifts with date filter
    const testDate = '2025-01-13';
    console.log(`2️⃣ Testing GET /user-shifts?date=${testDate}`);
    const response2 = await fetch(`${BASE_URL}/user-shifts?date=${testDate}`);
    const data2 = await response2.json();
    console.log('✅ Status:', response2.status);
    console.log('📊 Filtered data count:', Array.isArray(data2) ? data2.length : 'Not array');
    console.log('');

    // Test 3: Get user shifts by date
    console.log(`3️⃣ Testing GET /user-shifts/date/${testDate}`);
    const response3 = await fetch(`${BASE_URL}/user-shifts/date/${testDate}`);
    const data3 = await response3.json();
    console.log('✅ Status:', response3.status);
    console.log('📊 Response structure:', {
      date: data3.date,
      total: data3.total,
      scheduleKeys: data3.schedules ? Object.keys(data3.schedules) : 'No schedules'
    });
    console.log('');

    // Test 4: Get schedule statistics
    console.log(`4️⃣ Testing GET /user-shifts/stats?date=${testDate}`);
    const response4 = await fetch(`${BASE_URL}/user-shifts/stats?date=${testDate}`);
    const data4 = await response4.json();
    console.log('✅ Status:', response4.status);
    console.log('📊 Statistics:', data4.statistics);
    console.log('');

    // Test 5: Get user shifts with schedule_type filter
    console.log('5️⃣ Testing GET /user-shifts?schedule_type=day');
    const response5 = await fetch(`${BASE_URL}/user-shifts?schedule_type=day`);
    const data5 = await response5.json();
    console.log('✅ Status:', response5.status);
    console.log('📊 Day schedule count:', Array.isArray(data5) ? data5.length : 'Not array');
    console.log('');

    // Test 6: Test error handling - invalid date format
    console.log('6️⃣ Testing error handling with invalid date');
    const response6 = await fetch(`${BASE_URL}/user-shifts/date/invalid-date`);
    const data6 = await response6.json();
    console.log('✅ Status:', response6.status);
    console.log('❌ Error response:', data6);
    console.log('');

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Fungsi untuk test dengan data sample
async function testWithSampleData() {
  console.log('📝 Sample API calls for frontend integration:\n');

  const examples = [
    {
      name: 'Get all shifts for today',
      url: `${BASE_URL}/user-shifts?date=${new Date().toISOString().split('T')[0]}`
    },
    {
      name: 'Get day shifts only',
      url: `${BASE_URL}/user-shifts?schedule_type=day`
    },
    {
      name: 'Get night shifts only',
      url: `${BASE_URL}/user-shifts?schedule_type=night`
    },
    {
      name: 'Get fullday shifts only',
      url: `${BASE_URL}/user-shifts?schedule_type=fullday`
    },
    {
      name: 'Get off shifts only',
      url: `${BASE_URL}/user-shifts?schedule_type=off`
    },
    {
      name: 'Get schedule statistics for today',
      url: `${BASE_URL}/user-shifts/stats?date=${new Date().toISOString().split('T')[0]}`
    }
  ];

  for (const example of examples) {
    console.log(`🔗 ${example.name}:`);
    console.log(`   ${example.url}`);
    console.log('');
  }
}

// Jalankan tests
if (require.main === module) {
  console.log('🚀 Starting UserShift API Tests...\n');
  testAPI().then(() => {
    console.log('\n' + '='.repeat(50) + '\n');
    testWithSampleData();
  });
}

module.exports = { testAPI, testWithSampleData };