/**
 * Create Sales Officers (SOs) for BIS/BEV Structure
 *
 * Creates:
 * - 6 SOs (2 per area: SO1-ABIS/SO2-ABIS, SO1-ABEV/SO2-ABEV, SO1-ABISBEV/SO2-ABISBEV)
 * - Each SO has employee + user with role "SO"
 * - Territory assignment at area level
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function createSalesOfficers() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Territory = mongoose.model(
      "Territory",
      new mongoose.Schema({}, { strict: false }),
      "territories"
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

    // Get SO role and designation
    const soRole = await Role.findOne({ role: "SO" });
    const soDesignation = await Designation.findOne({ name: /sales.*officer/i });

    if (!soRole) {
      throw new Error("SO role not found. Please create it first.");
    }

    console.log("✅ Found SO role:", soRole._id);
    console.log("✅ Found SO designation:", soDesignation?.name || "Not found", "\n");

    // Define areas
    const areas = [
      { name: "ABIS", segment: "BIS" },
      { name: "ABEV", segment: "BEV" },
      { name: "ABISBEV", segment: "BISBEV" },
    ];

    console.log("🏗️  Creating Sales Officers (SOs)...\n");

    for (const { name: areaName, segment } of areas) {
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

      // Create 2 SOs for this area
      for (let soNum = 1; soNum <= 2; soNum++) {
        const soName = `SO${soNum}-${areaName}`;
        const soUsername = soName;

        console.log(`  👤 Creating SO: ${soName}`);

        // Create employee
        let employee = await Employee.findOne({ employee_id: soName });
        if (!employee) {
          employee = await Employee.create({
            name: soName,
            employee_id: soName,
            designation_id: soDesignation?._id,
            territory_assignments: [
              {
                territory_id: area._id,
                territory_type: "area",
                assigned_date: new Date(),
                is_primary: true,
              },
            ],
            active: true,
            email: `${soName.toLowerCase()}@example.com`,
            phone: "N/A",
            joining_date: new Date(),
          });
          console.log(`    ✅ Created Employee: ${employee.name} (${employee._id})`);
        } else {
          console.log(`    ℹ️  Employee already exists: ${employee.name} (${employee._id})`);
        }

        // Create user
        let user = await User.findOne({ username: soUsername });
        if (!user) {
          user = await User.create({
            name: soName,
            username: soUsername,
            email: `${soName.toLowerCase()}@example.com`,
            password: hashedPassword,
            role_id: soRole._id,
            employee_id: employee._id,
            active: true,
          });
          console.log(`    ✅ Created User: ${user.username} (${user._id})`);
          console.log(`       Password: pass123`);
        } else {
          console.log(`    ℹ️  User already exists: ${user.username} (${user._id})`);
        }

        console.log(`    ✨ Complete: ${soName} assigned to ${areaName}\n`);
      }

      console.log(`✅ Area ${areaName} complete with 2 SOs`);
    }

    console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All Sales Officers created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Summary:");
    console.log("  - 6 SO Employees created/verified (2 per area)");
    console.log("  - 6 SO Users created/verified (2 per area)");
    console.log("  - All assigned to their respective areas");
    console.log("  - Common password: pass123");

    console.log("\n🎯 Sales Officers Structure:");
    console.log("\n  BIS Segment:");
    console.log("    ABIS");
    console.log("      ├─ SO1-ABIS (username: SO1-ABIS, password: pass123)");
    console.log("      └─ SO2-ABIS (username: SO2-ABIS, password: pass123)");

    console.log("\n  BEV Segment:");
    console.log("    ABEV");
    console.log("      ├─ SO1-ABEV (username: SO1-ABEV, password: pass123)");
    console.log("      └─ SO2-ABEV (username: SO2-ABEV, password: pass123)");

    console.log("\n  BIS+BEV Segment:");
    console.log("    ABISBEV");
    console.log("      ├─ SO1-ABISBEV (username: SO1-ABISBEV, password: pass123)");
    console.log("      └─ SO2-ABISBEV (username: SO2-ABISBEV, password: pass123)");
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
createSalesOfficers();
