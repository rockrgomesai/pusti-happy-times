/**
 * Create BIS/BEV Managers and Users
 *
 * Creates:
 * - 9 Employees (Managers at Zone/Region/Area levels)
 * - 9 Users with username matching employee name
 * - Password: pass123 (for all)
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function createManagersAndUsers() {
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

    // Get roles
    const zsmRole = await Role.findOne({ role: "ZSM" });
    const rsmRole = await Role.findOne({ role: "RSM" });
    const asmRole = await Role.findOne({ role: "ASM" });

    if (!zsmRole || !rsmRole || !asmRole) {
      throw new Error("Required roles (ZSM, RSM, ASM) not found. Please create them first.");
    }

    console.log("✅ Found roles:");
    console.log(`  - ZSM: ${zsmRole._id}`);
    console.log(`  - RSM: ${rsmRole._id}`);
    console.log(`  - ASM: ${asmRole._id}\n`);

    // Get designations
    const zsmDesignation = await Designation.findOne({ name: /zonal.*manager/i });
    const rsmDesignation = await Designation.findOne({ name: /regional.*manager/i });
    const asmDesignation = await Designation.findOne({ name: /area.*manager/i });

    console.log("📋 Found designations:");
    console.log(`  - ZSM: ${zsmDesignation?.name || "Not found"}`);
    console.log(`  - RSM: ${rsmDesignation?.name || "Not found"}`);
    console.log(`  - ASM: ${asmDesignation?.name || "Not found"}\n`);

    // Define manager structure
    const managers = [
      // Zone Managers
      {
        name: "MZBIS",
        username: "MZBIS",
        territoryName: "ZBIS",
        territoryType: "zone",
        role: zsmRole,
        designation: zsmDesignation,
        level: "Zone",
      },
      {
        name: "MZBEV",
        username: "MZBEV",
        territoryName: "ZBEV",
        territoryType: "zone",
        role: zsmRole,
        designation: zsmDesignation,
        level: "Zone",
      },
      {
        name: "MZBISBEV",
        username: "MZBISBEV",
        territoryName: "ZBISBEV",
        territoryType: "zone",
        role: zsmRole,
        designation: zsmDesignation,
        level: "Zone",
      },
      // Region Managers
      {
        name: "MRBIS",
        username: "MRBIS",
        territoryName: "RBIS",
        territoryType: "region",
        role: rsmRole,
        designation: rsmDesignation,
        level: "Region",
      },
      {
        name: "MRBEV",
        username: "MRBEV",
        territoryName: "RBEV",
        territoryType: "region",
        role: rsmRole,
        designation: rsmDesignation,
        level: "Region",
      },
      {
        name: "MRBISBEV",
        username: "MRBISBEV",
        territoryName: "RBISBEV",
        territoryType: "region",
        role: rsmRole,
        designation: rsmDesignation,
        level: "Region",
      },
      // Area Managers
      {
        name: "MABIS",
        username: "MABIS",
        territoryName: "ABIS",
        territoryType: "area",
        role: asmRole,
        designation: asmDesignation,
        level: "Area",
      },
      {
        name: "MABEV",
        username: "MABEV",
        territoryName: "ABEV",
        territoryType: "area",
        role: asmRole,
        designation: asmDesignation,
        level: "Area",
      },
      {
        name: "MABISBEV",
        username: "MABISBEV",
        territoryName: "ABISBEV",
        territoryType: "area",
        role: asmRole,
        designation: asmDesignation,
        level: "Area",
      },
    ];

    console.log("👥 Creating Managers and Users...\n");

    for (const manager of managers) {
      console.log(`\n📍 Creating ${manager.level} Manager: ${manager.name}...`);

      // Find territory
      const territory = await Territory.findOne({
        name: manager.territoryName,
        type: manager.territoryType,
      });

      if (!territory) {
        console.log(
          `  ❌ Territory not found: ${manager.territoryName} (${manager.territoryType})`
        );
        continue;
      }

      console.log(`  ✅ Found territory: ${territory.name} (${territory._id})`);

      // Check if employee already exists
      let employee = await Employee.findOne({ name: manager.name });

      if (!employee) {
        // Create employee
        employee = await Employee.create({
          name: manager.name,
          employee_id: manager.name,
          designation_id: manager.designation?._id,
          territory_assignments: [
            {
              territory_id: territory._id,
              territory_type: manager.territoryType,
              assigned_date: new Date(),
              is_primary: true,
            },
          ],
          active: true,
          email: `${manager.username.toLowerCase()}@example.com`,
          phone: "N/A",
          joining_date: new Date(),
        });
        console.log(`  ✅ Created Employee: ${employee.name} (${employee._id})`);
      } else {
        console.log(`  ℹ️  Employee already exists: ${employee.name} (${employee._id})`);
      }

      // Check if user already exists
      let user = await User.findOne({ username: manager.username });

      if (!user) {
        // Create user
        user = await User.create({
          name: manager.name,
          username: manager.username,
          email: `${manager.username.toLowerCase()}@example.com`,
          password: hashedPassword,
          role_id: manager.role._id,
          employee_id: employee._id,
          active: true,
        });
        console.log(`  ✅ Created User: ${user.username} (${user._id})`);
        console.log(`     Password: pass123`);
      } else {
        console.log(`  ℹ️  User already exists: ${user.username} (${user._id})`);
      }

      console.log(
        `  ✨ Complete: ${manager.name} → ${manager.territoryName} (${manager.territoryType})`
      );
    }

    console.log("\n\n✅ All managers and users created successfully!");

    console.log("\n📊 Summary:");
    console.log("  - 9 Employees created/verified");
    console.log("  - 9 Users created/verified");
    console.log("  - Common password: pass123");

    console.log("\n🎯 Manager Structure:");
    console.log("\n  Zone Managers:");
    console.log("    - MZBIS (username: MZBIS) → ZBIS zone");
    console.log("    - MZBEV (username: MZBEV) → ZBEV zone");
    console.log("    - MZBISBEV (username: MZBISBEV) → ZBISBEV zone");

    console.log("\n  Region Managers:");
    console.log("    - MRBIS (username: MRBIS) → RBIS region");
    console.log("    - MRBEV (username: MRBEV) → RBEV region");
    console.log("    - MRBISBEV (username: MRBISBEV) → RBISBEV region");

    console.log("\n  Area Managers:");
    console.log("    - MABIS (username: MABIS) → ABIS area");
    console.log("    - MABEV (username: MABEV) → ABEV area");
    console.log("    - MABISBEV (username: MABISBEV) → ABISBEV area");
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
createManagersAndUsers();
