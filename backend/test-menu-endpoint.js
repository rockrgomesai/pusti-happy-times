const http = require('http');
const https = require('https');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testUserMenu() {
  try {
    // Login first
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginResponse = await makeRequest(loginOptions, {
      username: 'SuperAdmin',
      password: 'admin123'
    });
    
    if (loginResponse.status !== 200) {
      console.error('Login failed:', loginResponse);
      return;
    }
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('Login successful, token received');
    
    // Test user-menu endpoint
    const menuOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/menu-items/user-menu',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const menuResponse = await makeRequest(menuOptions);
    
    if (menuResponse.status === 200) {
      console.log('Menu response:', JSON.stringify(menuResponse.data, null, 2));
    } else {
      console.error('Menu request failed:');
      console.error('Status:', menuResponse.status);
      console.error('Response:', menuResponse.data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUserMenu();