/**
 * Assign a route to an SO (Sales Officer)
 * 
 * Usage: node scripts/assign-route-to-so.js <route_id> <username> <sr_slot> <days>
 * Example: node scripts/assign-route-to-so.js R1-DPBEV1-D1 alamgir478 sr_1 "SAT,SUN,MON,TUE,WED,THU,FRI"
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function assignRouteToSO() {
    try {
        const [, , routeId, username, srSlot, daysString] = process.argv;

        if (!routeId || !username || !srSlot || !daysString) {
            console.log('❌ Usage: node scripts/assign-route-to-so.js <route_id> <username> <sr_slot> <days>');
            console.log('');
            console.log('Arguments:');
            console.log('  route_id : The route ID (e.g., R1-DPBEV1-D1)');
            console.log('  username : The SO username (e.g., alamgir478)');
            console.log('  sr_slot  : Which slot to use: sr_1 or sr_2');
            console.log('  days     : Comma-separated days (e.g., "SAT,SUN,MON" or "ALL" for all days)');
            console.log('');
            console.log('Example:');
            console.log('  node scripts/assign-route-to-so.js R1-DPBEV1-D1 alamgir478 sr_1 "SAT,SUN,MON,TUE,WED,THU,FRI"');
            console.log('  node scripts/assign-route-to-so.js R1-DPBEV1-D1 alamgir478 sr_1 ALL');
            process.exit(1);
        }

        if (srSlot !== 'sr_1' && srSlot !== 'sr_2') {
            console.log('❌ sr_slot must be either "sr_1" or "sr_2"');
            process.exit(1);
        }

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log(`📊 Database: ${MONGODB_URI.split('@')[1]?.split('?')[0] || 'localhost'}\n`);

        const User = require('../src/models/User');
        const Route = require('../src/models/Route');

        // Find the user
        const user = await User.findOne({ username }).lean();
        if (!user) {
            console.log(`❌ User "${username}" not found`);
            await mongoose.connection.close();
            process.exit(1);
        }

        console.log(`👤 User: ${user.full_name || username} (${user._id})\n`);

        // Find the route
        const route = await Route.findOne({ route_id: routeId });
        if (!route) {
            console.log(`❌ Route "${routeId}" not found`);
            await mongoose.connection.close();
            process.exit(1);
        }

        console.log(`🛣️  Route: ${route.route_name} (${route.route_id})\n`);

        // Parse days
        let days = [];
        if (daysString.toUpperCase() === 'ALL') {
            days = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
        } else {
            days = daysString.split(',').map(d => d.trim().toUpperCase());

            // Validate days
            const validDays = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
            const invalidDays = days.filter(d => !validDays.includes(d));
            if (invalidDays.length > 0) {
                console.log(`❌ Invalid days: ${invalidDays.join(', ')}`);
                console.log(`   Valid days: ${validDays.join(', ')}`);
                await mongoose.connection.close();
                process.exit(1);
            }
        }

        console.log(`📅 Days: ${days.join(', ')}\n`);

        // Check if slot is already occupied
        const existingSR = route.sr_assignments[srSlot].sr_id;
        if (existingSR) {
            console.log(`⚠️  Warning: ${srSlot} is already assigned to: ${existingSR}`);
            console.log('   This will overwrite the existing assignment.\n');
        }

        // Assign the route
        route.sr_assignments[srSlot] = {
            sr_id: user._id,
            visit_days: days,
        };

        await route.save();

        console.log('✅ Route assigned successfully!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Assignment Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Route: ${route.route_id} - ${route.route_name}`);
        console.log(`SO: ${user.full_name || username}`);
        console.log(`Slot: ${srSlot}`);
        console.log(`Days: ${days.join(', ')}`);
        console.log('');
        console.log('💡 Next steps:');
        console.log('   1. Ask SO to logout and login again on mobile app');
        console.log('   2. Test "Mark Attendance" on any of the assigned days');
        console.log('   3. Test "Trace Route" on any of the assigned days');

        await mongoose.connection.close();
    } catch (error) {
        console.error('\n❌ Error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

assignRouteToSO();
