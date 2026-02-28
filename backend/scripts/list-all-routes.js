/**
 * List all routes with their SR assignments
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function listAllRoutes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${MONGODB_URI.split('@')[1]?.split('?')[0] || 'localhost'}\n`);

    const Route = require('../src/models/Route');
    const Employee = require('../src/models/Employee');

    // Get all active routes
    const routes = await Route.find({ active: true })
      .populate('sr_assignments.sr_1.sr_id', 'name employee_id')
      .populate('sr_assignments.sr_2.sr_id', 'name employee_id')
      .populate('area_id', 'name')
      .lean();

    console.log(`📋 Found ${routes.length} active routes\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    routes.forEach((route, index) => {
      console.log(`${index + 1}. Route: ${route.route_id} - ${route.route_name}`);
      console.log(`   Area: ${route.area_id?.name || 'N/A'}`);
      console.log(`   Outlets: ${route.outlet_ids?.length || 0}`);
      
      const sr1 = route.sr_assignments?.sr_1;
      if (sr1?.sr_id) {
        console.log(`   SR1: ${sr1.sr_id.name || 'N/A'} (${sr1.sr_id.employee_id || 'N/A'})`);
        console.log(`        Days: ${sr1.visit_days?.join(', ') || 'NONE'}`);
      } else {
        console.log(`   SR1: Not assigned`);
      }
      
      const sr2 = route.sr_assignments?.sr_2;
      if (sr2?.sr_id) {
        console.log(`   SR2: ${sr2.sr_id.name || 'N/A'} (${sr2.sr_id.employee_id || 'N/A'})`);
        console.log(`        Days: ${sr2.visit_days?.join(', ') || 'NONE'}`);
      } else {
        console.log(`   SR2: Not assigned`);
      }
      
      console.log();
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Also list all SO employees
    console.log('👥 Available SO/Sales Officers:\n');
    const employees = await Employee.find({ active: true })
      .populate('designation_id', 'designation')
      .limit(50)
      .lean();
    
    const salesOfficers = employees.filter(e => 
      e.designation_id?.designation?.includes('SO') ||
      e.designation_id?.designation?.includes('Sales Officer')
    );
    
    salesOfficers.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.name} (${emp.employee_id})`);
      console.log(`   ID: ${emp._id}`);
      console.log(`   Designation: ${emp.designation_id?.designation || 'N/A'}`);
      console.log();
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

listAllRoutes();
