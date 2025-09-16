#!/usr/bin/env node
/**
 * Full MongoDB Logical Backup Script
 * Dumps every collection from the pusti_happy_times database into a single JSON file
 * with a UTC timestamped filename: db/full_backup_YYYYMMDDThhmmssZ.json
 *
 * Does not require mongodump (pure JS using Mongoose/native driver).
 * Suitable for small/medium datasets. For large datasets prefer mongodump.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const DB_NAME = 'pusti_happy_times';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL || `mongodb://localhost:27017/${DB_NAME}`;

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
}

function isObjectId(v) {
  return v && typeof v === 'object' && v.constructor && v.constructor.name === 'ObjectId';
}

function sanitizeDoc(doc) {
  if (Array.isArray(doc)) return doc.map(sanitizeDoc);
  if (doc && typeof doc === 'object') {
    const out = {};
    for (const k of Object.keys(doc)) {
      const val = doc[k];
      if (isObjectId(val)) {
        out[k] = val.toString();
      } else if (Array.isArray(val)) {
        out[k] = val.map(item => (isObjectId(item) ? item.toString() : sanitizeDoc(item)));
      } else if (val && typeof val === 'object') {
        out[k] = sanitizeDoc(val);
      } else {
        out[k] = val;
      }
    }
    return out;
  }
  return doc;
}

(async () => {
  console.log('🔄 Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    const db = mongoose.connection.db;
    console.log('✅ Connected');

    const collections = await db.listCollections().toArray();
    console.log(`📚 Found ${collections.length} collections`);

    const backup = { meta: { db: DB_NAME, generatedAt: new Date().toISOString(), collections: collections.map(c => c.name) }, data: {} };

    for (const colInfo of collections) {
      const name = colInfo.name;
      console.log(`➡️  Exporting ${name} ...`);
      const col = db.collection(name);
      const docs = await col.find({}).toArray();
      backup.data[name] = docs.map(sanitizeDoc);
      console.log(`   ✔ ${name}: ${docs.length} documents`);
    }

    const outFile = path.join(__dirname, `full_backup_${timestamp()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`\n🎉 Backup complete -> ${outFile}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Backup failed:', err); 
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
})();
