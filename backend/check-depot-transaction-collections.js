require('dotenv').config();
const { connectDB } = require('./src/config/database');
const mongoose = require('mongoose');

async function checkDepotTransactionCollections() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Check if collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const hasDepotTransactionsIn = collectionNames.includes('depot_transactions_in');
    const hasDepottransactionins = collectionNames.includes('depottransactionins');
    const hasDepotTransactionsOut = collectionNames.includes('depot_transactions_out');
    const hasDepottransactionouts = collectionNames.includes('depottransactionouts');
    
    console.log('📋 Collection Status:');
    console.log('\n🔵 IN Transactions:');
    console.log(`   depot_transactions_in (correct): ${hasDepotTransactionsIn ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   depottransactionins (duplicate): ${hasDepottransactionins ? '⚠️  EXISTS' : '✅ CLEAN'}`);
    
    console.log('\n🔴 OUT Transactions:');
    console.log(`   depot_transactions_out (correct): ${hasDepotTransactionsOut ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   depottransactionouts (duplicate): ${hasDepottransactionouts ? '⚠️  EXISTS' : '✅ CLEAN'}`);
    console.log('');
    
    // Count documents
    if (hasDepotTransactionsIn || hasDepottransactionins) {
      console.log('📊 IN Transaction Counts:');
      if (hasDepotTransactionsIn) {
        const count = await db.collection('depot_transactions_in').countDocuments();
        console.log(`   depot_transactions_in: ${count} documents`);
      }
      if (hasDepottransactionins) {
        const count = await db.collection('depottransactionins').countDocuments();
        console.log(`   depottransactionins: ${count} documents`);
      }
      console.log('');
    }
    
    if (hasDepotTransactionsOut || hasDepottransactionouts) {
      console.log('📊 OUT Transaction Counts:');
      if (hasDepotTransactionsOut) {
        const count = await db.collection('depot_transactions_out').countDocuments();
        console.log(`   depot_transactions_out: ${count} documents`);
      }
      if (hasDepottransactionouts) {
        const count = await db.collection('depottransactionouts').countDocuments();
        console.log(`   depottransactionouts: ${count} documents`);
      }
      console.log('');
    }
    
    // Check model definitions
    console.log('🔍 Checking Model Definitions...');
    const models = require('./src/models');
    
    if (models.DepotTransactionIn) {
      console.log(`   DepotTransactionIn model: ✅ EXISTS`);
      console.log(`   Collection name: ${models.DepotTransactionIn.collection.name}`);
    }
    
    if (models.DepotTransactionOut) {
      console.log(`   DepotTransactionOut model: ✅ EXISTS`);
      console.log(`   Collection name: ${models.DepotTransactionOut.collection.name}`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkDepotTransactionCollections();
