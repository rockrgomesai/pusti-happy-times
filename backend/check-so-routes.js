/**
 * Check SO routes assignments for testing purposes
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti-ht';

async function checkSORoutes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
    const Route = mongoose.model('Route', new mongoose.Schema({}, { strict: false }));
    const Designation = mongoose.model('Designation', new mongoose.Schema({}, { strict: false }));

    // Find SO designation
    const soDesignation = await Designation.findOne({ name: 'Sales Officer' }).lean();
    
    if (!soDesignation) {
      console.log('❌ SO designation not found in database');
      console.log('Available designations:');
      const allDesignations = await Designation.find().lean();
      allDesignations.forEach(d => console.log('  -', d.name));
      return;
    }

    console.log(`Found SO designation: ${soDesignation.name} (${soDesignation._id})\n`);

    // Find all SOs
    const employees = await Employee.find({ designation_id: soDesignation._id }).lean();
    console.log(`Total SOs found: ${employees.length}\n`);
    console.log('='.repeat(80));

    for (const emp of employees) {
      console.log(`\n${emp.name} (${emp.employee_id || emp._id})`);
      console.log('-'.repeat(80));

      if (!emp.routes || emp.routes.length === 0) {
        console.log('  ❌ No routes assigned');
        continue;
      }

      console.log(`  Total routes: ${emp.routes.length}`);

      // Get route details
      const routeIds = emp.routes.map(r => {
        if (typeof r === 'object' && r.route_id) return r.route_id;
        if (mongoose.Types.ObjectId.isValid(r)) return r;
        return null;
      }).filter(Boolean);

      if (routeIds.length > 0) {
        const routes = await Route.find({ _id: { $in: routeIds } }).lean();
        const routeMap = {};
        routes.forEach(r => {
          routeMap[r._id.toString()] = r;
        });

        emp.routes.forEach((r, index) => {
          const routeId = (typeof r === 'object' && r.route_id) ? r.route_id : r;
          const route = routeMap[routeId.toString()];
          const day = index + 1;
          
          if (route) {
            console.log(`  Day ${day} (${getDayName(day)}): ${route.route_name || route.name || routeId} (${routeId})`);
          } else {
            console.log(`  Day ${day} (${getDayName(day)}): ${routeId} (Route not found in database)`);
          }
        });

        // Check for duplicates
        const uniqueRouteIds = new Set(routeIds.map(id => id.toString()));
        if (uniqueRouteIds.size !== routeIds.length) {
          console.log(`  ⚠️  WARNING: Found ${routeIds.length - uniqueRouteIds.size} duplicate route(s)`);
        } else if (routeIds.length === 6) {
          console.log(`  ✅ All 6 days have different routes`);
        } else if (routeIds.length < 6) {
          console.log(`  ⚠️  Only ${routeIds.length} routes assigned (expected 6 for full week)`);
        } else {
          console.log(`  ⚠️  ${routeIds.length} routes assigned (more than 6 days)`);
        }
      } else {
        console.log('  ⚠️  Routes exist but no valid route IDs found');
      }
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

function getDayName(day) {
  const days = ['', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  return days[day] || `Day ${day}`;
}

checkSORoutes();
