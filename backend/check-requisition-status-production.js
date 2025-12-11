require('dotenv').config();
const mongoose = require('mongoose');
const InventoryRequisition = require('./src/models/InventoryRequisition');

async function checkRequisitionStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all submitted requisitions
    const requisitions = await InventoryRequisition.find({
      status: 'submitted'
    })
      .populate('from_depot_id', 'name')
      .select('requisition_no status scheduling_status from_depot_id details')
      .lean();

    console.log(`\n📋 Found ${requisitions.length} SUBMITTED requisitions:\n`);

    for (const req of requisitions) {
      console.log(`Requisition: ${req.requisition_no}`);
      console.log(`  From Depot: ${req.from_depot_id?.name || 'N/A'}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Scheduling Status: ${req.scheduling_status || 'NOT SET ❌'}`);
      console.log(`  Details Count: ${req.details?.length || 0}`);
      
      if (req.details?.length > 0) {
        const firstDetail = req.details[0];
        console.log(`  First Detail:`);
        console.log(`    - qty: ${firstDetail.qty}`);
        console.log(`    - scheduled_qty: ${firstDetail.scheduled_qty || 0}`);
        console.log(`    - unscheduled_qty: ${firstDetail.unscheduled_qty || 'NOT SET ❌'}`);
      }
      console.log('');
    }

    // Check what would match the API query
    const matchingRequisitions = await InventoryRequisition.find({
      status: 'submitted',
      scheduling_status: { $in: ['not-scheduled', 'partially-scheduled'] }
    }).countDocuments();

    console.log(`\n🔍 Requisitions matching API query (status=submitted AND scheduling_status in [not-scheduled, partially-scheduled]):`);
    console.log(`   Count: ${matchingRequisitions}`);

    if (matchingRequisitions === 0) {
      console.log('\n⚠️  NO REQUISITIONS MATCH - The fix-requisition-scheduling-status.js script needs to be run!');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRequisitionStatus();
