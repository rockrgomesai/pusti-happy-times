const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function updatePasswords() {
    const uri = 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin';
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('pusti_happy_times');
        const usersCollection = db.collection('users');
        
        // Generate bcrypt hashes
        const admin123Hash = await bcrypt.hash('admin123', 12);
        const demo123Hash = await bcrypt.hash('demo123', 12);
        
        console.log('Generated hashes:');
        console.log('admin123 hash:', admin123Hash);
        console.log('demo123 hash:', demo123Hash);
        
        // Update superadmin password
        const result1 = await usersCollection.updateOne(
            { username: 'superadmin' },
            { $set: { password: admin123Hash } }
        );
        console.log('Superadmin password updated:', result1.modifiedCount);
        
        // Update demo password
        const result2 = await usersCollection.updateOne(
            { username: 'demo' },
            { $set: { password: demo123Hash } }
        );
        console.log('Demo password updated:', result2.modifiedCount);
        
        console.log(' All passwords updated successfully!');
        console.log('You can now login with:');
        console.log('Username: superadmin, Password: admin123');
        console.log('Username: demo, Password: demo123');
        
    } catch (error) {
        console.error('Error updating passwords:', error);
    } finally {
        await client.close();
    }
}

updatePasswords();
