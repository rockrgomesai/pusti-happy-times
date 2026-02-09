const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin';

async function resetSOPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Reset password for so1z1r1a1
    const username = 'so1z1r1a1';
    const newPassword = 'sales123'; // Simple password for testing
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await db.collection('users').updateOne(
      { username },
      { $set: { password: hashedPassword, updated_at: new Date() } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Password reset successful!\n');
      console.log('═'.repeat(60));
      console.log('Username: so1z1r1a1');
      console.log('Password: sales123');
      console.log('═'.repeat(60));
      console.log('\nYou can now login to the mobile app with these credentials.');
    } else {
      console.log('❌ User not found or password already set');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

resetSOPassword();
