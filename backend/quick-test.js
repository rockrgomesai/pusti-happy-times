const http = require('http');

// Test the endpoint directly
const postData = JSON.stringify({
  username: 'SuperAdmin',
  password: 'admin123'
});

// Login request
const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing login...');

const loginReq = http.request(loginOptions, (res) => {
  let loginData = '';
  res.on('data', chunk => loginData += chunk);
  res.on('end', () => {
    console.log('Login Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      const loginResponse = JSON.parse(loginData);
      const token = loginResponse.data.tokens.accessToken;
      console.log('Login successful, testing menu...');
      
      // Menu request
      const menuOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/menu-items/user-menu',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      const menuReq = http.request(menuOptions, (menuRes) => {
        let menuData = '';
        menuRes.on('data', chunk => menuData += chunk);
        menuRes.on('end', () => {
          console.log('\nMenu Status:', menuRes.statusCode);
          console.log('Menu Response:', menuData);
          process.exit(0);
        });
      });
      
      menuReq.on('error', err => {
        console.error('Menu Error:', err);
        process.exit(1);
      });
      
      menuReq.end();
      
    } else {
      console.log('Login failed:', loginData);
      process.exit(1);
    }
  });
});

loginReq.on('error', err => {
  console.error('Login Error:', err);
  process.exit(1);
});

loginReq.write(postData);
loginReq.end();