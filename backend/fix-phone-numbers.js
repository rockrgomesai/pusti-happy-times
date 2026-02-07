/**
 * Migration script to fix phone numbers in existing distributor records
 * Converts +01XXXXXXXXX to +8801XXXXXXXXX format
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti-ht';

// Normalization function (same as in the model)
const normalizePhone = (value) => {
  if (!value) {
    return null;
  }
  // Handle multiple phone numbers separated by comma or space
  const numbers = String(value).split(/[,\s]+/).filter(n => n.trim());
  if (!numbers.length) {
    return null;
  }
  
  // Normalize each number
  const normalized = numbers.map(num => {
    // Remove all non-digits first (including any + signs)
    const digitsOnly = num.replace(/\D/g, "");
    if (!digitsOnly.length) return null;
    
    // If starts with 88 (already has BD country code), add +
    if (digitsOnly.startsWith("88")) {
      return `+${digitsOnly}`;
    }
    
    // If starts with 01 (Bangladesh mobile number), add +88
    if (digitsOnly.startsWith("01")) {
      return `+88${digitsOnly}`;
    }
    
    // For other international numbers, add + prefix
    return `+${digitsOnly}`;
  }).filter(Boolean);
  
  return normalized.length ? normalized.join(", ") : null;
};

async function fixPhoneNumbers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Distributor = mongoose.model('Distributor', new mongoose.Schema({}, { strict: false }));

    // Find all distributors with phone numbers
    const distributors = await Distributor.find({
      $or: [
        { mobile: { $exists: true, $ne: null } },
        { emergency_mobile: { $exists: true, $ne: null } }
      ]
    });

    console.log(`Found ${distributors.length} distributors with phone numbers`);

    let updatedCount = 0;
    
    for (const distributor of distributors) {
      let needsUpdate = false;
      const updates = {};

      // Fix mobile number
      if (distributor.mobile) {
        const normalized = normalizePhone(distributor.mobile);
        if (normalized && normalized !== distributor.mobile) {
          updates.mobile = normalized;
          needsUpdate = true;
          console.log(`Fixing mobile for ${distributor.name}: ${distributor.mobile} -> ${normalized}`);
        }
      }

      // Fix emergency mobile
      if (distributor.emergency_mobile) {
        const normalized = normalizePhone(distributor.emergency_mobile);
        if (normalized && normalized !== distributor.emergency_mobile) {
          updates.emergency_mobile = normalized;
          needsUpdate = true;
          console.log(`Fixing emergency_mobile for ${distributor.name}: ${distributor.emergency_mobile} -> ${normalized}`);
        }
      }

      if (needsUpdate) {
        await Distributor.updateOne({ _id: distributor._id }, { $set: updates });
        updatedCount++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Updated ${updatedCount} distributors`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixPhoneNumbers();
