const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function testJWT() {
  try {
    await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
    
    // Login and get a token
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'SuperAdmin', password: 'admin123' })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.data.tokens.accessToken;
    console.log('Token received:', token.substring(0, 50) + '...');
    
    // Try to verify the token manually
    require('dotenv').config();
    const secret = process.env.JWT_ACCESS_SECRET;
    console.log('Using secret:', secret.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, secret);
    console.log('JWT verified successfully');
    console.log('Decoded payload:', decoded);
    
    // Try to load the user
    const { User } = require('./src/models');
    const user = await User.findById(decoded.userId).populate('role_id');
    console.log('User found:', !!user);
    console.log('User data:', user ? {
      id: user._id,
      username: user.username,
      active: user.active,
      role: user.role_id?.role
    } : null);
    
    // Check if getSafeProfile works
    if (user && typeof user.getSafeProfile === 'function') {
      const profile = user.getSafeProfile();
      console.log('getSafeProfile works:', Object.keys(profile));
    } else {
      console.log('getSafeProfile method:', typeof user?.getSafeProfile);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testJWT();