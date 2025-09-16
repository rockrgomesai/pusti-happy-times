require('dotenv').config({ path: __dirname + '/.env' });
console.log('Environment loaded:');
console.log('JWT_ACCESS_SECRET:', process.env.JWT_ACCESS_SECRET?.substring(0, 10) + '...');
console.log('Starting server...');
require('./server.js');