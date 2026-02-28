/**
 * Add outlets to a route
 * 
 * Usage: node scripts/add-outlets-to-route.js <route_id> <area_id>
 * Example: node scripts/add-outlets-to-route.js 1000 <area_id>
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function addOutletsToRoute() {
  try {
    const [, , routeId, areaId] = process.argv;
    
    if (!routeId) {
      console.log('❌ Usage: node scripts/add-outlets-to-route.js <route_id> [area_id]');
      console.log('');
      console.log('Arguments:');
      console.log('  route_id : The route ID (e.g., 1000)');
      console.log('  area_id  : (Optional) Specific area to find outlets from');
      console.log('');
      console.log('Example:');
      console.log('  node scripts/add-outlets-to-route.js 1000');
      console.log('  node scripts/add-outlets-to-route.js 1000 <area_object_id>');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${MONGODB_URI.split('@')[1]?.split('?')[0] || 'localhost'}\n`);

    const Route = require('../src/models/Route');
    const Outlet = require('../src/models/Outlet');

    // Find the route
    const route = await Route.findOne({ route_id: routeId })
      .populate('area_id', 'name')
      .populate('distributor_id', 'name');
      
    if (!route) {
      console.log(`❌ Route "${routeId}" not found`);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('🛣️  Route Found:');
    console.log(`   Route ID: ${route.route_id}`);
    console.log(`   Route Name: ${route.route_name}`);
    console.log(`   Area: ${route.area_id?.name || 'N/A'}`);
    console.log(`   Distributor: ${route.distributor_id?.name || 'N/A'}`);
    console.log(`   Current Outlets: ${route.outlet_ids?.length || 0}\n`);

    // Search for outlets
    const searchAreaId = areaId || route.area_id?._id;
    const distributorId = route.distributor_id?._id;

    if (!searchAreaId) {
      console.log('❌ No area ID available. Please provide area_id as parameter.');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`🔍 Searching for outlets in area: ${searchAreaId}\n`);

    // Find outlets in the same area
    const query = {
      active: true,
      $or: [
        { area_id: searchAreaId },
        { distributor_id: distributorId },
      ]
    };

    const availableOutlets = await Outlet.find(query)
      .limit(100)
      .select('outlet_id outlet_name address location lati longi')
      .lean();

    console.log(`📍 Found ${availableOutlets.length} outlets\n`);

    if (availableOutlets.length === 0) {
      console.log('⚠️  No outlets found in this area.');
      console.log('\n💡 Available options:');
      console.log('   1. Create outlets via the web frontend (Routes & Outlets > Outlets)');
      console.log('   2. Import outlets using bulk upload');
      console.log('   3. Search in a different area by providing area_id parameter');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Show first few outlets
    console.log('Sample outlets to be assigned:');
    availableOutlets.slice(0, 5).forEach((outlet, idx) => {
      console.log(`${idx + 1}. ${outlet.outlet_name || outlet.outlet_id}`);
      console.log(`   Address: ${outlet.address || 'N/A'}`);
      console.log(`   GPS: ${outlet.lati || 'N/A'}, ${outlet.longi || 'N/A'}`);
    });
    if (availableOutlets.length > 5) {
      console.log(`   ... and ${availableOutlets.length - 5} more\n`);
    }

    // Prompt confirmation (in real scenario, you'd want to confirm)
    console.log(`\n❓ Assign ${availableOutlets.length} outlets to route ${route.route_id}?`);
    console.log('   Type "yes" to continue, or run with --auto-confirm flag\n');

    // For automation, check for --auto-confirm flag
    const autoConfirm = process.argv.includes('--auto-confirm');
    
    if (!autoConfirm) {
      console.log('⚠️  Run with --auto-confirm flag to proceed:');
      console.log(`   node scripts/add-outlets-to-route.js ${routeId} ${areaId || ''} --auto-confirm\n`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Assign outlets to route
    const outletIds = availableOutlets.map(o => o._id);
    route.outlet_ids = outletIds;
    route.outlet_qty = outletIds.length;
    route.actual_outlet_qty = outletIds.length;
    
    await route.save();

    console.log('\n✅ Outlets assigned successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Assignment Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Route: ${route.route_id} - ${route.route_name}`);
    console.log(`Outlets Assigned: ${outletIds.length}`);
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. SO alamgir478 should logout and login on mobile');
    console.log('   2. Try "Mark Attendance" near any of the outlets');
    console.log('   3. Try "Trace Route" to see all outlets on map');

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addOutletsToRoute();
