const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Initial delivery depot data
const initialDepots = [
  {
    name: 'Dhaka Central Depot',
    address: 'Tejgaon Industrial Area, Dhaka',
    district: 'Dhaka',
    division: 'Dhaka',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    name: 'Chattogram Port Depot',
    address: 'Agrabad, Chattogram',
    district: 'Chattogram',
    division: 'Chattogram',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    name: 'Khulna Regional Depot',
    address: 'Shibbari, Khulna',
    district: 'Khulna',
    division: 'Khulna',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    name: 'Rajshahi North Depot',
    address: 'Shaheb Bazar, Rajshahi',
    district: 'Rajshahi',
    division: 'Rajshahi',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    name: 'Sylhet Division Depot',
    address: 'Ambarkhana, Sylhet',
    district: 'Sylhet',
    division: 'Sylhet',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    name: 'Rangpur Zone Depot',
    address: 'Central Road, Rangpur',
    district: 'Rangpur',
    division: 'Rangpur',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    name: 'Barishal Coastal Depot',
    address: 'Band Road, Barishal',
    district: 'Barishal',
    division: 'Barishal',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    name: 'Mymensingh Hub Depot',
    address: 'Charpara, Mymensingh',
    district: 'Mymensingh',
    division: 'Mymensingh',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

async function seedDeliveryDepots() {
  const client = new MongoClient(MONGODB_URI);

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const depotsCollection = db.collection('delivery_depots');

    // Check if depots already exist
    const existingCount = await depotsCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Delivery depots already exist (${existingCount} found)`);
      console.log('   Run this script only on a fresh database or delete existing depots first');
      return;
    }

    // Insert initial depots
    console.log(`\n📦 Inserting ${initialDepots.length} delivery depots...`);
    const result = await depotsCollection.insertMany(initialDepots);
    console.log(`✅ Successfully created ${result.insertedCount} delivery depots\n`);

    // Display created depots
    console.log('📋 Created delivery depots:');
    initialDepots.forEach((depot, index) => {
      console.log(`   ${index + 1}. ${depot.name} - ${depot.district}, ${depot.division}`);
    });

    console.log('\n✅ Delivery depot seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding delivery depots:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDeliveryDepots();
