/**
 * Assign 6 different random routes to Sales Officers for testing
 * - Routes must have 50+ outlets
 * - Mix of clustered and separate lat/longs for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti-ht';

async function assignTestRoutes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
    const Route = mongoose.model('Route', new mongoose.Schema({}, { strict: false }));
    const Outlet = mongoose.model('Outlet', new mongoose.Schema({}, { strict: false }));
    const Designation = mongoose.model('Designation', new mongoose.Schema({}, { strict: false }));

    // Step 1: Find Sales Officer designation
    const soDesignation = await Designation.findOne({ name: 'Sales Officer' }).lean();
    if (!soDesignation) {
      console.log('❌ Sales Officer designation not found');
      return;
    }

    // Step 2: Find all routes
    const allRoutes = await Route.find({ active: true }).lean();
    console.log(`Found ${allRoutes.length} active routes\n`);

    // Step 3: Analyze each route for outlet count and lat/long distribution
    console.log('Analyzing routes...\n');
    const routeAnalysis = [];

    for (const route of allRoutes) {
      const outlets = await Outlet.find({ route_id: route._id }).lean();
      
      if (outlets.length < 50) continue;

      // Analyze lat/long distribution
      const latLongs = outlets
        .filter(o => o.latitude && o.longitude)
        .map(o => `${o.latitude},${o.longitude}`);
      
      const uniqueLocations = new Set(latLongs);
      const hasClusters = latLongs.length > 0 && uniqueLocations.size < latLongs.length;
      const clusterRatio = latLongs.length > 0 ? (latLongs.length - uniqueLocations.size) / latLongs.length : 0;

      routeAnalysis.push({
        route,
        outletCount: outlets.length,
        totalWithLocation: latLongs.length,
        uniqueLocations: uniqueLocations.size,
        hasClusters,
        clusterRatio,
        clusteredOutlets: latLongs.length - uniqueLocations.size
      });
    }

    // Sort by outlet count
    routeAnalysis.sort((a, b) => b.outletCount - a.outletCount);

    console.log('Routes with 50+ outlets:');
    console.log('='.repeat(100));
    routeAnalysis.forEach(r => {
      const clusterInfo = r.hasClusters 
        ? `✓ ${r.clusteredOutlets} clustered (${(r.clusterRatio * 100).toFixed(1)}%)`
        : '✗ No clusters';
      console.log(`${r.route.route_name || r.route.name}: ${r.outletCount} outlets, ${r.totalWithLocation} with location, ${clusterInfo}`);
    });
    console.log('='.repeat(100));
    console.log();

    if (routeAnalysis.length < 6) {
      console.log(`❌ Not enough routes with 50+ outlets (found ${routeAnalysis.length}, need 6)`);
      return;
    }

    // Step 4: Select 6 routes - mix of clustered and non-clustered
    const clusteredRoutes = routeAnalysis.filter(r => r.hasClusters && r.clusterRatio > 0.1);
    const separateRoutes = routeAnalysis.filter(r => !r.hasClusters || r.clusterRatio <= 0.1);

    let selectedRoutes = [];
    
    // Pick 3 routes with clusters
    if (clusteredRoutes.length >= 3) {
      selectedRoutes.push(...clusteredRoutes.slice(0, 3));
    } else {
      selectedRoutes.push(...clusteredRoutes);
    }
    
    // Fill remaining with separate location routes
    const remaining = 6 - selectedRoutes.length;
    selectedRoutes.push(...separateRoutes.slice(0, remaining));

    // If still not enough, just take top 6
    if (selectedRoutes.length < 6) {
      selectedRoutes = routeAnalysis.slice(0, 6);
    }

    console.log('\nSelected 6 routes for assignment:');
    console.log('='.repeat(100));
    selectedRoutes.forEach((r, i) => {
      const clusterInfo = r.hasClusters 
        ? `${r.clusteredOutlets} clustered outlets (${(r.clusterRatio * 100).toFixed(1)}%)`
        : 'No clusters - all separate locations';
      console.log(`${i + 1}. ${r.route.route_name || r.route.name}: ${r.outletCount} outlets, ${clusterInfo}`);
    });
    console.log('='.repeat(100));
    console.log();

    // Step 5: Find all Sales Officers
    const salesOfficers = await Employee.find({ designation_id: soDesignation._id }).lean();
    console.log(`Found ${salesOfficers.length} Sales Officers\n`);

    // Step 6: Assign routes to each SO (6 days, 6 routes)
    let updatedCount = 0;
    
    for (const so of salesOfficers) {
      const routes = selectedRoutes.map(r => r.route._id);
      
      await Employee.updateOne(
        { _id: so._id },
        { $set: { routes: routes } }
      );
      
      console.log(`✓ Assigned 6 routes to ${so.name} (${so.employee_id})`);
      updatedCount++;
    }

    console.log(`\n${'='.repeat(100)}`);
    console.log(`✅ Successfully assigned 6 routes to ${updatedCount} Sales Officers`);
    console.log(`${'='.repeat(100)}\n`);

    // Verify assignments
    console.log('Verification:');
    console.log('-'.repeat(100));
    const verifyEmployees = await Employee.find({ designation_id: soDesignation._id }).lean();
    for (const emp of verifyEmployees) {
      if (emp.routes && emp.routes.length > 0) {
        const routeDetails = await Route.find({ _id: { $in: emp.routes } }).lean();
        console.log(`${emp.name}: ${emp.routes.length} routes`);
        routeDetails.forEach((r, i) => {
          const analysis = selectedRoutes.find(sr => sr.route._id.toString() === r._id.toString());
          console.log(`  Day ${i + 1}: ${r.route_name || r.name} (${analysis ? analysis.outletCount : '?'} outlets)`);
        });
      } else {
        console.log(`${emp.name}: No routes`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

assignTestRoutes();
