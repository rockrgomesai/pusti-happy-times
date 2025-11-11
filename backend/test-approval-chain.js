/**
 * Test: Show Approval Chain for a Distributor's Collection
 * This script demonstrates which users will be in the approval chain
 */

const mongoose = require("mongoose");
const Distributor = require("./src/models/Distributor");
const Territory = require("./src/models/Territory");
const Employee = require("./src/models/Employee");
const User = require("./src/models/User");
const Role = require("./src/models/Role");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function showApprovalChain() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(DB_URI);
    console.log("✅ Connected\n");

    // Find a sample distributor (or use a specific one)
    const distributor = await Distributor.findOne().populate("db_point_id").lean();

    if (!distributor) {
      console.log("❌ No distributors found in database");
      return;
    }

    // Find the user for this distributor
    const distUser = await User.findOne({ distributor_id: distributor._id }).lean();

    console.log("📦 DISTRIBUTOR INFO");
    console.log(`   Name: ${distributor.name}`);
    console.log(`   DB Point: ${distributor.db_point_id?.name || "N/A"}`);
    console.log(`   User: ${distUser?.username || "N/A"}`);
    console.log("");

    // Get the DB Point territory and its ancestors
    const dbPoint = await Territory.findById(distributor.db_point_id).populate("ancestors").lean();

    if (!dbPoint) {
      console.log("❌ DB Point territory not found");
      return;
    }

    console.log("🗺️  TERRITORY HIERARCHY");
    console.log(`   DB Point: ${dbPoint.name} (Level 3)`);

    // Get ancestors in order: [zone, region, area]
    const ancestors = await Territory.find({
      _id: { $in: dbPoint.ancestors },
    })
      .sort({ level: 1 })
      .lean();

    const zone = ancestors.find((t) => t.type === "zone");
    const region = ancestors.find((t) => t.type === "region");
    const area = ancestors.find((t) => t.type === "area");

    if (area) console.log(`   Area: ${area.name} (Level 2)`);
    if (region) console.log(`   Region: ${region.name} (Level 1)`);
    if (zone) console.log(`   Zone: ${zone.name} (Level 0)`);
    console.log("");

    // Now find employees/users at each level
    const roles = {
      ASM: await Role.findOne({ role: "ASM" }).lean(),
      RSM: await Role.findOne({ role: "RSM" }).lean(),
      ZSM: await Role.findOne({ role: "ZSM" }).lean(),
      SalesAdmin: await Role.findOne({ role: "Sales Admin" }).lean(),
      OrderManagement: await Role.findOne({ role: "Order Management" }).lean(),
      Finance: await Role.findOne({ role: "Finance" }).lean(),
    };

    console.log("👥 APPROVAL CHAIN");
    console.log("   (Based on territory assignments and roles)\n");

    // 1. ASM - Area Sales Manager (should have this Area in their territory_assignments.area_ids)
    console.log("1️⃣  ASM (Area Sales Manager)");
    if (area) {
      const asmEmployees = await Employee.find({
        "territory_assignments.area_ids": area._id,
        status: "Active",
      }).lean();

      if (asmEmployees.length > 0) {
        for (const emp of asmEmployees) {
          const user = await User.findOne({ employee_id: emp._id, role_id: roles.ASM?._id })
            .populate("role_id")
            .lean();
          if (user) {
            console.log(`   ✅ ${user.username} - ${emp.name} (Area: ${area.name})`);
          }
        }
      } else {
        console.log(`   ⚠️  No ASM found for Area: ${area.name}`);
      }
    } else {
      console.log("   ⚠️  No Area found in hierarchy");
    }
    console.log("");

    // 2. RSM - Regional Sales Manager (should have this Region in their territory_assignments.region_ids)
    console.log("2️⃣  RSM (Regional Sales Manager)");
    if (region) {
      const rsmEmployees = await Employee.find({
        "territory_assignments.region_ids": region._id,
        status: "Active",
      }).lean();

      if (rsmEmployees.length > 0) {
        for (const emp of rsmEmployees) {
          const user = await User.findOne({ employee_id: emp._id, role_id: roles.RSM?._id })
            .populate("role_id")
            .lean();
          if (user) {
            console.log(`   ✅ ${user.username} - ${emp.name} (Region: ${region.name})`);
          }
        }
      } else {
        console.log(`   ⚠️  No RSM found for Region: ${region.name}`);
      }
    } else {
      console.log("   ⚠️  No Region found in hierarchy");
    }
    console.log("");

    // 3. ZSM - Zonal Sales Manager (VIEW ONLY - should have this Zone in their territory_assignments.zone_ids)
    console.log("3️⃣  ZSM (Zonal Sales Manager) - VIEW ONLY");
    if (zone) {
      const zsmEmployees = await Employee.find({
        "territory_assignments.zone_ids": zone._id,
        status: "Active",
      }).lean();

      if (zsmEmployees.length > 0) {
        for (const emp of zsmEmployees) {
          const user = await User.findOne({ employee_id: emp._id, role_id: roles.ZSM?._id })
            .populate("role_id")
            .lean();
          if (user) {
            console.log(`   👀 ${user.username} - ${emp.name} (Zone: ${zone.name})`);
          }
        }
      } else {
        console.log(`   ⚠️  No ZSM found for Zone: ${zone.name}`);
      }
    } else {
      console.log("   ⚠️  No Zone found in hierarchy");
    }
    console.log("");

    // 4. Sales Admin - ALL get notification (not territory-specific)
    console.log("4️⃣  Sales Admin");
    const salesAdminUsers = await User.find({ role_id: roles.SalesAdmin?._id, status: "active" })
      .populate("employee_id")
      .lean();
    if (salesAdminUsers.length > 0) {
      salesAdminUsers.forEach((user) => {
        console.log(`   ✅ ${user.username} - ${user.employee_id?.name || "N/A"}`);
      });
    } else {
      console.log("   ⚠️  No Sales Admin users found");
    }
    console.log("");

    // 5. Order Management - ALL get notification
    console.log("5️⃣  Order Management");
    const orderMgmtUsers = await User.find({
      role_id: roles.OrderManagement?._id,
      status: "active",
    })
      .populate("employee_id")
      .lean();
    if (orderMgmtUsers.length > 0) {
      orderMgmtUsers.forEach((user) => {
        console.log(`   ✅ ${user.username} - ${user.employee_id?.name || "N/A"}`);
      });
    } else {
      console.log("   ⚠️  No Order Management users found");
    }
    console.log("");

    // 6. Finance - ALL get notification
    console.log("6️⃣  Finance (Final Approval)");
    const financeUsers = await User.find({ role_id: roles.Finance?._id, status: "active" })
      .populate("employee_id")
      .lean();
    if (financeUsers.length > 0) {
      financeUsers.forEach((user) => {
        console.log(`   ✅ ${user.username} - ${user.employee_id?.name || "N/A"}`);
      });
    } else {
      console.log("   ⚠️  No Finance users found");
    }
    console.log("");

    console.log("═══════════════════════════════════════════════════════");
    console.log("📋 SUMMARY");
    console.log("═══════════════════════════════════════════════════════");
    console.log("");
    console.log("✅ Territory-based routing NOW IMPLEMENTED in collectionNotifications.js!");
    console.log("");
    console.log("🎯 How it works:");
    console.log(
      `   - ASM: Notified ONLY if their territory_assignments.area_ids includes ${area?.name || "this area"}`
    );
    console.log(
      `   - RSM: Notified ONLY if their territory_assignments.region_ids includes ${region?.name || "this region"}`
    );
    console.log(
      `   - ZSM: Notified ONLY if their territory_assignments.zone_ids includes ${zone?.name || "this zone"}`
    );
    console.log(
      "   - Sales Admin/Order Management/Finance: ALL users with role (global, not territory-filtered)"
    );
    console.log("");
    console.log(`📍 For distributor "${distributor.name}" at "${dbPoint?.name}"`);
    console.log(`   - Multiple ASMs in ${area?.name} → ALL get notified`);
    console.log(`   - Multiple RSMs in ${region?.name} → ALL get notified`);
    console.log(`   - Multiple ZSMs in ${zone?.name} → ALL get notified`);
    console.log("   - ASMs in other areas → NOT notified");
    console.log("   - RSMs in other regions → NOT notified");
    console.log("   - ZSMs in other zones → NOT notified");
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  }
}

showApprovalChain();
