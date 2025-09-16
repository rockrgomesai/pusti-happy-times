const { spawn } = require('child_process');
const http = require('http');

// Start server as child process
console.log('Starting server...');
const server = spawn('node', ['server.js'], { 
  cwd: 'C:\\tkg\\pusti-ht-mern\\backend',
  stdio: 'pipe'
});

let serverOutput = '';
server.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log(output);
  
  // Wait for server to be ready
  if (output.includes('MONGODB CONNECTED')) {
    setTimeout(testEndpoint, 2000);
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

function testEndpoint() {
  console.log('\n=== Testing Login ===');
  
  const postData = JSON.stringify({
    username: 'SuperAdmin',
    password: 'admin123'
  });

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
            console.log('\n=== Menu Test Results ===');
            console.log('Menu Status:', menuRes.statusCode);
            console.log('Menu Response:', menuData);
            
            // Kill server and exit
            server.kill('SIGTERM');
            setTimeout(() => process.exit(0), 1000);
          });
        });
        
        menuReq.on('error', err => {
          console.error('Menu Error:', err);
          server.kill('SIGTERM');
          setTimeout(() => process.exit(1), 1000);
        });
        
        menuReq.end();
        
      } else {
        console.log('Login failed:', loginData);
        server.kill('SIGTERM');
        setTimeout(() => process.exit(1), 1000);
      }
    });
  });

  loginReq.on('error', err => {
    console.error('Login Error:', err);
    server.kill('SIGTERM');
    setTimeout(() => process.exit(1), 1000);
  });

  loginReq.write(postData);
  loginReq.end();
}

process.on('exit', () => {
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
});