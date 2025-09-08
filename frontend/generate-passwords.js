const bcrypt = require('bcrypt');

async function generatePasswordHashes() {
    const saltRounds = 12;
    
    const admin123Hash = await bcrypt.hash('admin123', saltRounds);
    const demo123Hash = await bcrypt.hash('demo123', saltRounds);
    
    console.log('admin123 hash:', admin123Hash);
    console.log('demo123 hash:', demo123Hash);
}

generatePasswordHashes();
