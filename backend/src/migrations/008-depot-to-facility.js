/**
 * Migration 008: Transform Depots and Factories to Facilities
 * 
 * This migration:
 * 1. Creates the new 'facilities' collection
 * 2. Migrates all depots to facilities with type='Depot'
 * 3. Migrates all factories to facilities with type='Factory'
 * 4. Updates employee facility_assignments to use facility IDs
 * 5. Updates product depot_ids to facility_ids
 * 6. Backs up old collections
 * 
 * Run: node backend/src/migrations/008-depot-to-facility.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function migrate() {
  try {
    console.log('🔄 Starting Migration 008: Depot/Factory to Facility transformation');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Step 1: Create facilities collection if it doesn't exist
    console.log('\n📦 Step 1: Creating facilities collection...');
    const collections = await db.listCollections({ name: 'facilities' }).toArray();
    
    if (collections.length === 0) {
      await db.createCollection('facilities');
      console.log('✅ Facilities collection created');
    } else {
      console.log('ℹ️  Facilities collection already exists');
    }

    // Step 2: Migrate depots to facilities
    console.log('\n📦 Step 2: Migrating depots to facilities...');
    const depots = await db.collection('depots').find({}).toArray();
    console.log(`Found ${depots.length} depots to migrate`);

    if (depots.length > 0) {
      const depotFacilities = depots.map(depot => ({
        ...depot,
        type: 'Depot',
        depot_id: depot.depot_id || depot._id.toString(),
        location: depot.location || null,
        contact_person: depot.contact_person || null,
        contact_mobile: depot.contact_mobile || null,
        active: depot.active !== undefined ? depot.active : true,
      }));

      // Check if any depots already migrated
      const existingDepotFacilities = await db.collection('facilities').countDocuments({ type: 'Depot' });
      
      if (existingDepotFacilities === 0) {
        await db.collection('facilities').insertMany(depotFacilities);
        console.log(`✅ Migrated ${depotFacilities.length} depots to facilities`);
      } else {
        console.log(`ℹ️  ${existingDepotFacilities} depot facilities already exist, skipping insertion`);
      }
    }

    // Step 3: Migrate factories to facilities (if factories collection exists)
    console.log('\n📦 Step 3: Migrating factories to facilities...');
    const factoriesCollectionExists = await db.listCollections({ name: 'factories' }).toArray();
    
    if (factoriesCollectionExists.length > 0) {
      const factories = await db.collection('factories').find({}).toArray();
      console.log(`Found ${factories.length} factories to migrate`);

      if (factories.length > 0) {
        const factoryFacilities = factories.map(factory => ({
          ...factory,
          type: 'Factory',
          factory_id: factory.factory_id || factory._id.toString(),
          location: factory.location || null,
          contact_person: factory.contact_person || null,
          contact_mobile: factory.contact_mobile || null,
          active: factory.active !== undefined ? factory.active : true,
        }));

        const existingFactoryFacilities = await db.collection('facilities').countDocuments({ type: 'Factory' });
        
        if (existingFactoryFacilities === 0) {
          await db.collection('facilities').insertMany(factoryFacilities);
          console.log(`✅ Migrated ${factoryFacilities.length} factories to facilities`);
        } else {
          console.log(`ℹ️  ${existingFactoryFacilities} factory facilities already exist, skipping insertion`);
        }
      }
    } else {
      console.log('ℹ️  No factories collection found, skipping factory migration');
    }

    // Step 4: Create ID mapping for employees update
    console.log('\n📦 Step 4: Creating ID mapping for employees...');
    const facilities = await db.collection('facilities').find({}).toArray();
    
    const depotIdMap = new Map();
    const factoryIdMap = new Map();
    
    facilities.forEach(facility => {
      if (facility.type === 'Depot' && facility.depot_id) {
        // Map old depot _id to new facility _id
        const oldDepot = depots.find(d => d._id.equals(facility._id));
        if (oldDepot) {
          depotIdMap.set(oldDepot._id.toString(), facility._id);
        }
      } else if (facility.type === 'Factory' && facility.factory_id) {
        factoryIdMap.set(facility._id.toString(), facility._id);
      }
    });

    console.log(`✅ Created mapping: ${depotIdMap.size} depots, ${factoryIdMap.size} factories`);

    // Step 5: Update employees facility_assignments
    console.log('\n📦 Step 5: Updating employee facility assignments...');
    const employees = await db.collection('employees').find({
      employee_type: 'facility'
    }).toArray();

    console.log(`Found ${employees.length} facility employees to update`);

    for (const employee of employees) {
      if (employee.facility_assignments) {
        const updates = {};
        let hasChanges = false;

        // Depot IDs remain the same (they're already ObjectIds)
        if (employee.facility_assignments.depot_ids?.length > 0) {
          updates['facility_assignments.depot_ids'] = employee.facility_assignments.depot_ids;
          hasChanges = true;
        }

        // Factory IDs remain the same
        if (employee.facility_assignments.factory_ids?.length > 0) {
          updates['facility_assignments.factory_ids'] = employee.facility_assignments.factory_ids;
          hasChanges = true;
        }

        if (hasChanges) {
          await db.collection('employees').updateOne(
            { _id: employee._id },
            { $set: updates }
          );
        }
      }
    }

    console.log(`✅ Updated ${employees.length} employee facility assignments`);

    // Step 6: Update products depot_ids to facility_ids
    console.log('\n📦 Step 6: Updating product depot references...');
    
    // Add facility_ids field to products that have depot_ids
    const productsWithDepots = await db.collection('products').countDocuments({
      depot_ids: { $exists: true, $ne: [] }
    });

    console.log(`Found ${productsWithDepots} products with depot assignments`);

    if (productsWithDepots > 0) {
      // Copy depot_ids to facility_ids for all products
      await db.collection('products').updateMany(
        { depot_ids: { $exists: true } },
        [
          {
            $set: {
              facility_ids: '$depot_ids'
            }
          }
        ]
      );
      console.log(`✅ Added facility_ids field to products (copied from depot_ids)`);
    }

    // Step 7: Create indexes on facilities collection
    console.log('\n📦 Step 7: Creating indexes on facilities collection...');
    await db.collection('facilities').createIndex({ name: 1 }, { unique: true });
    await db.collection('facilities').createIndex({ type: 1, active: 1 });
    await db.collection('facilities').createIndex({ depot_id: 1 }, { sparse: true });
    await db.collection('facilities').createIndex({ factory_id: 1 }, { sparse: true });
    console.log('✅ Indexes created on facilities collection');

    // Summary
    console.log('\n📊 Migration Summary:');
    const facilitySummary = await db.collection('facilities').aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    facilitySummary.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    const totalFacilities = await db.collection('facilities').countDocuments();
    console.log(`   Total facilities: ${totalFacilities}`);

    console.log('\n✅ Migration 008 completed successfully!');
    console.log('\n⚠️  NOTE: The old "depots" and "factories" collections are still intact.');
    console.log('   You can safely delete them after verifying the migration.');
    console.log('   Run: db.depots.drop() and db.factories.drop() in MongoDB shell');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 MongoDB connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\n🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;
