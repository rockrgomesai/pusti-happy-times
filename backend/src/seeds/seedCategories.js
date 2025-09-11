/**
 * Seed Categories Collection
 * Inserts an initial leaf category: "Biscuits" into the "categories" collection.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

async function run() {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    const coll = db.collection('categories');

    // Ensure basic useful index exists (unique per parent + slug)
    try {
      await coll.createIndex({ parent: 1, slug: 1 }, { unique: true });
    } catch (_) {
      // ignore if cannot create (permissions or already exists)
    }

    const slug = 'biscuits';
    const now = new Date();

    const existing = await coll.findOne({ slug, parent: null });
    if (existing) {
      console.log('✅ Category "Biscuits" already exists with _id =', existing._id.toString());
    } else {
      const doc = {
        category: 'Biscuits',
        slug,
        fullSlug: slug,
        parent: null,
        ancestors: [],
        hasChildren: false,
        depth: 0,
        sortOrder: 0,
        isActive: true,
        createdBy: null,
        updatedBy: null,
        createdAt: now,
        updatedAt: now,
      };

      const res = await coll.insertOne(doc);
      console.log('🌱 Inserted seed category "Biscuits" with _id =', res.insertedId.toString());
    }
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch {}
  }
}

run();
