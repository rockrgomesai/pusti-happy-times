/**
 * Create DB Points, Distributors, and DSRs for BIS/BEV Structure
 *
 * Creates:
 * - 6 DB Points (2 per area: DPBIS1/2, DPBEV1/2, DPBISBEV1/2)
 * - 12 Distributors (2 per DB point)
 * - 12 DSRs (1 per distributor, with employee + user)
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function createDBDistributorsDSRs() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Territory = mongoose.model(
      "Territory",
      new mongoose.Schema({}, { strict: false }),
      "territories"
    );

    const Distributor = mongoose.model(
      "Distributor",
      new mongoose.Schema({}, { strict: false }),
      "distributors"
    );

    const Employee = mongoose.model(
      "Employee",
      new mongoose.Schema({}, { strict: false }),
      "employees"
    );

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");

    const Designation = mongoose.model(
      "Designation",
      new mongoose.Schema({}, { strict: false }),
      "designations"
    );

    // Hash password
    const hashedPassword = await bcrypt.hash("pass123", 10);

    // Get DSR role and designation
    const dsrRole = await Role.findOne({ role: "DSR" });
    const dsrDesignation = await Designation.findOne({ name: /distributor.*sales/i });

    if (!dsrRole) {
      throw new Error("DSR role not found. Please create it first.");
    }

    console.log("✅ Found DSR role:", dsrRole._id);
    console.log("✅ Found DSR designation:", dsrDesignation?.name || "Not found", "\n");

    // Define structure
    const areas = ["ABIS", "ABEV", "ABISBEV"];
    const segments = ["BIS", "BEV", "BISBEV"];

    console.log("🏗️  Creating DB Points, Distributors, and DSRs...\n");

    for (let i = 0; i < areas.length; i++) {
      const areaName = areas[i];
      const segment = segments[i];

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📍 Processing Area: ${areaName}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Find the area
      const area = await Territory.findOne({ name: areaName, type: "area" });
      if (!area) {
        console.log(`❌ Area not found: ${areaName}\n`);
        continue;
      }
      console.log(`✅ Found area: ${area.name} (${area._id})\n`);

      // Create 2 DB Points for this area
      for (let dp = 1; dp <= 2; dp++) {
        const dbPointName = `DP${segment}${dp}`;
        console.log(`  🔹 Creating DB Point: ${dbPointName}`);

        let dbPoint = await Territory.findOne({ name: dbPointName, type: "db_point" });
        if (!dbPoint) {
          dbPoint = await Territory.create({
            name: dbPointName,
            territory_id: dbPointName,
            type: "db_point",
            level: 4,
            parent_id: area._id,
            active: true,
          });
          console.log(`    ✅ Created DB Point: ${dbPoint.name} (${dbPoint._id})`);
        } else {
          console.log(`    ℹ️  DB Point already exists: ${dbPoint.name} (${dbPoint._id})`);
        }

        // Create 2 Distributors for this DB Point
        for (let dist = 1; dist <= 2; dist++) {
          const distributorName = `DIST-${dbPointName}-${dist}`;
          const distributorId = `${dbPointName}-D${dist}`;

          console.log(`\n    📦 Creating Distributor: ${distributorName}`);

          let distributor = await Distributor.findOne({ distributor_id: distributorId });
          if (!distributor) {
            distributor = await Distributor.create({
              name: distributorName,
              distributor_id: distributorId,
              db_point_id: dbPoint._id,
              active: true,
              contact_person: "N/A",
              phone: "N/A",
              email: `${distributorId.toLowerCase()}@example.com`,
              address: `${areaName} Territory - ${dbPointName}`,
            });
            console.log(`      ✅ Created Distributor: ${distributor.name} (${distributor._id})`);
          } else {
            console.log(
              `      ℹ️  Distributor already exists: ${distributor.name} (${distributor._id})`
            );
          }

          // Create DSR for this Distributor
          const dsrName = `DSR-${distributorId}`;
          const dsrUsername = dsrName;

          console.log(`\n      👤 Creating DSR: ${dsrName}`);

          // Create employee
          let employee = await Employee.findOne({ employee_id: dsrName });
          if (!employee) {
            employee = await Employee.create({
              name: dsrName,
              employee_id: dsrName,
              designation_id: dsrDesignation?._id,
              distributor_assignments: [
                {
                  distributor_id: distributor._id,
                  assigned_date: new Date(),
                  is_primary: true,
                },
              ],
              active: true,
              email: `${dsrName.toLowerCase()}@example.com`,
              phone: "N/A",
              joining_date: new Date(),
            });
            console.log(`        ✅ Created Employee: ${employee.name} (${employee._id})`);
          } else {
            console.log(`        ℹ️  Employee already exists: ${employee.name} (${employee._id})`);
          }

          // Create user
          let user = await User.findOne({ username: dsrUsername });
          if (!user) {
            user = await User.create({
              name: dsrName,
              username: dsrUsername,
              email: `${dsrName.toLowerCase()}@example.com`,
              password: hashedPassword,
              role_id: dsrRole._id,
              employee_id: employee._id,
              active: true,
            });
            console.log(`        ✅ Created User: ${user.username} (${user._id})`);
            console.log(`           Password: pass123`);
          } else {
            console.log(`        ℹ️  User already exists: ${user.username} (${user._id})`);
          }

          console.log(`        ✨ Complete: ${dsrName} → ${distributorName}`);
        }

        console.log(`\n    ✅ DB Point ${dbPointName} complete with 2 distributors and 2 DSRs`);
      }

      console.log(`\n✅ Area ${areaName} complete with 2 DB Points, 4 distributors, and 4 DSRs`);
    }

    console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All structures created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Summary:");
    console.log("  - 6 DB Points created/verified (2 per area)");
    console.log("  - 12 Distributors created/verified (2 per DB point)");
    console.log("  - 12 DSR Employees created/verified (1 per distributor)");
    console.log("  - 12 DSR Users created/verified (1 per distributor)");
    console.log("  - Common password: pass123");

    console.log("\n🎯 Structure:");
    console.log("\n  BIS Segment:");
    console.log("    ABIS");
    console.log("      ├─ DPBIS1");
    console.log("      │   ├─ DIST-DPBIS1-1 → DSR-DPBIS1-D1");
    console.log("      │   └─ DIST-DPBIS1-2 → DSR-DPBIS1-D2");
    console.log("      └─ DPBIS2");
    console.log("          ├─ DIST-DPBIS2-1 → DSR-DPBIS2-D1");
    console.log("          └─ DIST-DPBIS2-2 → DSR-DPBIS2-D2");

    console.log("\n  BEV Segment:");
    console.log("    ABEV");
    console.log("      ├─ DPBEV1");
    console.log("      │   ├─ DIST-DPBEV1-1 → DSR-DPBEV1-D1");
    console.log("      │   └─ DIST-DPBEV1-2 → DSR-DPBEV1-D2");
    console.log("      └─ DPBEV2");
    console.log("          ├─ DIST-DPBEV2-1 → DSR-DPBEV2-D1");
    console.log("          └─ DIST-DPBEV2-2 → DSR-DPBEV2-D2");

    console.log("\n  BIS+BEV Segment:");
    console.log("    ABISBEV");
    console.log("      ├─ DPBISBEV1");
    console.log("      │   ├─ DIST-DPBISBEV1-1 → DSR-DPBISBEV1-D1");
    console.log("      │   └─ DIST-DPBISBEV1-2 → DSR-DPBISBEV1-D2");
    console.log("      └─ DPBISBEV2");
    console.log("          ├─ DIST-DPBISBEV2-1 → DSR-DPBISBEV2-D1");
    console.log("          └─ DIST-DPBISBEV2-2 → DSR-DPBISBEV2-D2");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
createDBDistributorsDSRs();
