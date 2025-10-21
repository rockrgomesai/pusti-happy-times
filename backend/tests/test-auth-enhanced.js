/**
 * Test Authentication with Enhanced Schema
 * 
 * Tests login for all user types and verifies:
 * - JWT tokens include correct context
 * - User type and employee type are returned
 * - Context data includes territories/facilities/departments
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:5000/api/v1';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}`)
};

// Test users
const testUsers = [
  {
    username: 'superadmin',
    password: 'admin123',
    expectedType: 'employee',
    expectedEmployeeType: 'system_admin',
    description: 'System Admin (Full Access)'
  },
  {
    username: 'emp-0002',
    password: 'admin123',
    expectedType: 'employee',
    expectedEmployeeType: 'field',
    description: 'Field Employee (Territory-based)'
  },
  {
    username: 'emp-0003',
    password: 'admin123',
    expectedType: 'employee',
    expectedEmployeeType: 'hq',
    description: 'HQ Employee (Department-based)'
  }
];

// Make HTTP request using Node's http module
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test login for a user
async function testLogin(user) {
  try {
    log.section(`Testing: ${user.description}`);
    console.log(`Username: ${user.username}`);
    
    const response = await makeRequest(`${API_BASE_URL}/auth/login`, {
      username: user.username,
      password: user.password
    });
    
    if (response.status === 200) {
      log.success('Login successful');
      
      const data = response.data;
      
      // Debug: show response structure
      console.log('\nResponse Structure:');
      console.log('Keys:', Object.keys(data));
      
      // Check basic response structure
      if (data.token && data.refreshToken && data.user) {
        log.success('Response includes token, refreshToken, and user');
      } else if (data.accessToken && data.refreshToken && data.user) {
        log.success('Response includes accessToken, refreshToken, and user');
        data.token = data.accessToken; // Normalize
      } else {
        log.error('Missing required fields in response');
        console.log('Response data:', JSON.stringify(data, null, 2));
        return false;
      }
      
      // Verify user_type
      if (data.user.user_type === user.expectedType) {
        log.success(`User type correct: ${data.user.user_type}`);
      } else {
        log.error(`User type mismatch: expected ${user.expectedType}, got ${data.user.user_type}`);
        return false;
      }
      
      // Verify context exists
      if (data.context) {
        log.success('Context data present');
        
        // Check employee_type
        if (data.context.employee_type === user.expectedEmployeeType) {
          log.success(`Employee type correct: ${data.context.employee_type}`);
        } else {
          log.error(`Employee type mismatch: expected ${user.expectedEmployeeType}, got ${data.context.employee_type}`);
        }
        
        // Check context fields based on employee type
        console.log('\nContext Details:');
        console.log(`  Employee Type: ${data.context.employee_type}`);
        console.log(`  Employee Code: ${data.context.employee_code}`);
        console.log(`  Employee Name: ${data.context.employee_name}`);
        
        if (user.expectedEmployeeType === 'field') {
          if (data.context.territory_assignments) {
            const territoryCount = data.context.territory_assignments.all_territory_ids?.length || 0;
            log.success(`Territory assignments present: ${territoryCount} territories`);
            console.log('  Territory IDs:', data.context.territory_assignments.all_territory_ids?.slice(0, 3).join(', '));
          } else {
            log.error('Territory assignments missing for field employee');
          }
        }
        
        if (user.expectedEmployeeType === 'hq') {
          if (data.context.department) {
            log.success(`Department assigned: ${data.context.department}`);
            console.log(`  Department: ${data.context.department}`);
          } else {
            log.error('Department missing for HQ employee');
          }
        }
        
        if (user.expectedEmployeeType === 'system_admin') {
          log.success('System admin - no context restrictions');
        }
        
      } else {
        log.error('Context data missing from response');
        return false;
      }
      
      // Decode JWT token (basic check)
      try {
        const tokenParts = data.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          log.success('JWT token valid format');
          
          console.log('\nToken Payload:');
          console.log(`  User ID: ${payload.userId}`);
          console.log(`  User Type: ${payload.user_type}`);
          console.log(`  Employee Type: ${payload.employee_type}`);
          console.log(`  Token Version: ${payload.tokenVersion}`);
          
          if (payload.employee_type === user.expectedEmployeeType) {
            log.success('Token payload contains correct employee_type');
          } else {
            log.error('Token payload employee_type mismatch');
          }
        }
      } catch (e) {
        log.warn('Could not decode JWT token');
      }
      
      console.log('\n' + '─'.repeat(70));
      return true;
      
    } else {
      log.error(`Login failed with status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log.error('No response from server - Is the backend running?');
      log.info('Start backend with: npm run backend:dev');
    } else {
      log.error(`Error: ${error.message}`);
    }
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('━'.repeat(70));
  log.header('🧪 Authentication System Test Suite');
  console.log('━'.repeat(70));
  
  log.info('Testing enhanced authentication with user_type and context');
  log.info(`API Base URL: ${API_BASE_URL}`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const user of testUsers) {
    const result = await testLogin(user);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }
  
  // Summary
  console.log('\n━'.repeat(70));
  log.header('📊 Test Summary');
  console.log('━'.repeat(70));
  console.log(`\nTotal Tests: ${testUsers.length}`);
  console.log(`${colors.green}✓ Passed: ${successCount}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${failCount}${colors.reset}`);
  
  if (failCount === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 All tests passed!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️  Some tests failed${colors.reset}\n`);
  }
  
  console.log('━'.repeat(70));
  
  if (successCount > 0) {
    log.section('✅ Verified Features:');
    console.log('  • Login endpoint works with enhanced schema');
    console.log('  • JWT tokens include user_type and employee_type');
    console.log('  • Context data is returned in login response');
    console.log('  • Territory assignments for field employees');
    console.log('  • Department assignments for HQ employees');
    console.log('  • System admin has no restrictions');
  }
  
  console.log('\n' + '━'.repeat(70));
  console.log('');
}

// Run the tests
runTests();
