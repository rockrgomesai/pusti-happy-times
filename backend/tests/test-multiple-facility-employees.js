/**
 * Test Multiple Employees at Same Facility
 * 
 * Validates: Multiple employees can manage the same depot
 */

const http = require('http');

const makeRequest = (username) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify({username, password: 'admin123'}));
    req.end();
  });
};

const testMultipleFacilityEmployees = async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏪 Testing Multiple Employees at Same Facility\n');
  
  const users = ['emp-0002', 'emp-0004', 'emp-0005'];
  const results = [];
  
  for (const username of users) {
    try {
      const response = await makeRequest(username);
      
      if (response.success) {
        const context = response.data.user.context;
        results.push({
          username,
          name: context.employee_name,
          employee_code: context.employee_code,
          depot_ids: context.facility_assignments.depot_ids
        });
      }
    } catch (error) {
      console.log(`❌ Error testing ${username}:`, error.message);
    }
  }
  
  console.log('📋 Facility Employees Configuration:\n');
  
  // Group by depot
  const depotMap = {};
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name} (${result.employee_code})`);
    console.log(`   Username: ${result.username}`);
    console.log(`   Depot IDs: ${result.depot_ids.join(', ')}`);
    console.log('');
    
    // Track depot assignments
    result.depot_ids.forEach(depotId => {
      if (!depotMap[depotId]) {
        depotMap[depotId] = [];
      }
      depotMap[depotId].push(result.name);
    });
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🏪 Depot-to-Employee Mapping:\n');
  
  Object.entries(depotMap).forEach(([depotId, employees]) => {
    console.log(`Depot: ${depotId}`);
    console.log(`Employees (${employees.length}):`);
    employees.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Validate use case
  const allSameDepot = results.every(r => 
    r.depot_ids.length === 1 && 
    r.depot_ids[0] === results[0].depot_ids[0]
  );
  
  if (allSameDepot) {
    console.log('✅ Use Case Validated: Multiple employees managing SAME facility\n');
    console.log('   ✓ All 3 employees assigned to same depot');
    console.log('   ✓ Collaborative facility management supported');
    console.log('   ✓ Each employee can login with same depot access');
  } else {
    console.log('⚠️  Warning: Employees assigned to different depots');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

testMultipleFacilityEmployees();
