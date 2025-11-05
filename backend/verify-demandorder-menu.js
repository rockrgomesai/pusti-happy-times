const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const SidebarMenuItem = mongoose.model(
  "SidebarMenuItem",
  new mongoose.Schema({
    label: String,
    href: String,
    icon: String,
    parent_id: mongoose.Schema.Types.ObjectId,
    is_submenu: Boolean,
    order: Number,
    active: Boolean,
  })
);

const RoleSidebarMenuItem = mongoose.model(
  "RoleSidebarMenuItem",
  new mongoose.Schema({
    role: String,
    sidebar_menu_item_id: mongoose.Schema.Types.ObjectId,
  })
);

async function verifyMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // Find Order Management parent
    const orderMgmtMenu = await SidebarMenuItem.findOne({ label: "Order Management" });
    if (orderMgmtMenu) {
      console.log("✓ Order Management menu found:");
      console.log(`  ID: ${orderMgmtMenu._id}`);
      console.log(`  Label: ${orderMgmtMenu.label}`);
      console.log(`  Icon: ${orderMgmtMenu.icon}`);
      console.log(`  Active: ${orderMgmtMenu.active}\n`);

      // Find Demand Orders submenu
      const demandOrderMenu = await SidebarMenuItem.findOne({
        label: "Demand Orders",
        parent_id: orderMgmtMenu._id,
      });

      if (demandOrderMenu) {
        console.log("✓ Demand Orders submenu found:");
        console.log(`  ID: ${demandOrderMenu._id}`);
        console.log(`  Label: ${demandOrderMenu.label}`);
        console.log(`  Href: ${demandOrderMenu.href}`);
        console.log(`  Icon: ${demandOrderMenu.icon}`);
        console.log(`  Active: ${demandOrderMenu.active}\n`);

        // Check role assignments
        const roleAssignments = await RoleSidebarMenuItem.find({
          sidebar_menu_item_id: demandOrderMenu._id,
        });

        console.log("✓ Role assignments for Demand Orders:");
        if (roleAssignments.length > 0) {
          roleAssignments.forEach((assignment) => {
            console.log(`  - Role: ${assignment.role}`);
          });
        } else {
          console.log("  ⚠ No role assignments found!");
        }
      } else {
        console.log("✗ Demand Orders submenu NOT found!");
      }
    } else {
      console.log("✗ Order Management menu NOT found!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

verifyMenu();
