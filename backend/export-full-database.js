const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';
const OUTPUT_DIR = path.join(__dirname, 'full_database_export');

async function exportFullDatabase() {
  let connection;
  try {
    console.log(' Starting FULL database export...\n');
    if (fs.existsSync(OUTPUT_DIR)) {
      console.log(' Clearing existing directory...');
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    
    connection = await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log(' Connected to MongoDB\n');
    
    const collections = await db.listCollections().toArray();
    console.log( Found  collections\n);
    
    let totalDocs = 0;
    for (const collInfo of collections) {
      const collName = collInfo.name;
      if (collName.startsWith('system.')) continue;
      
      try {
        const data = await db.collection(collName).find({}).toArray();
        if (data.length > 0) {
          fs.writeFileSync(path.join(OUTPUT_DIR, ${collName}.json), JSON.stringify(data, null, 2));
          console.log(    :  documents);
          totalDocs += data.length;
        } else {
          console.log(    : empty);
        }
      } catch (error) {
        console.log(    : );
      }
    }
    
    console.log('\n Exporting indexes...\n');
    const allIndexes = {};
    for (const collInfo of collections) {
      const collName = collInfo.name;
      if (collName.startsWith('system.')) continue;
      try {
        const indexes = await db.collection(collName).indexes();
        allIndexes[collName] = indexes.filter(idx => idx.name !== '_id_');
      } catch (error) {}
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, '_all_indexes.json'), JSON.stringify(allIndexes, null, 2));
    
    const metadata = {
      exportDate: new Date().toISOString(),
      databaseName: 'pusti_happy_times',
      totalCollections: collections.length,
      totalDocuments: totalDocs,
      note: 'Full database export - ALL data from local development'
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, '_metadata.json'), JSON.stringify(metadata, null, 2));
    
    console.log('\n Export complete!');
    console.log( Total:  collections,  documents\n);
  } catch (error) {
    console.error(' Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log(' Disconnected');
    }
  }
}

exportFullDatabase().catch(console.error);
