require('dotenv').config();

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('MONGODB_URI_LOCAL:', process.env.MONGODB_URI_LOCAL);
console.log('All env vars available:', Object.keys(process.env).filter(key => key.startsWith('MONGODB')));
