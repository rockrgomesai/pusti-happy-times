/**
 * Script to check raw menu item documents
 *
 * Usage: node check-menu-raw.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ MongoDB connected");
  } catch (error) {
    console.error("✗ MongoDB connection error:", error);
    process.exit(1);
  }
};

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Checking DO Menu Items ===\n");

    // Get the raw collection
    const db = mongoose.connection.db;
    const menuCollection = db.collection("sidebar_menu_items");

    // Find DO-related menu items by href
    const doMenus = await menuCollection
      .find({
        $or: [{ href: "/demandorder/do-list" }, { href: "/demandorder/my-do-list" }],
      })
      .toArray();

    console.log(`Found ${doMenus.length} DO menu items:\n`);

    doMenus.forEach((menu, index) => {
      console.log(`${index + 1}. Menu Item:`);
      console.log(JSON.stringify(menu, null, 2));
      console.log("");
    });

    // Check role assignments
    const roleMenuCollection = db.collection("role_sidebar_menu_items");

    for (const menu of doMenus) {
      console.log(`\n--- Assignments for: ${menu.href} ---\n`);

      const assignments = await roleMenuCollection
        .find({ sidebar_menu_item_id: menu._id })
        .toArray();

      console.log(`Found ${assignments.length} role assignments`);

      if (assignments.length > 0) {
        // Get role details
        const roleIds = assignments.map((a) => a.role_id);
        const roles = await db
          .collection("roles")
          .find({ _id: { $in: roleIds } })
          .toArray();

        assignments.forEach((assignment, idx) => {
          const role = roles.find((r) => r._id.equals(assignment.role_id));
          console.log(`  ${idx + 1}. ${role ? role.role || role.name : "Unknown Role"}`);
        });
      }
      console.log("");
    }

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
