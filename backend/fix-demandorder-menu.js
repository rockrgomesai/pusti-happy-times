const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function fixDemandOrderMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const SidebarMenuItem = mongoose.connection.db.collection("sidebar_menu_items");
    
    // Update the "DO" menu item to point to the correct URL
    const doMenuItem = await SidebarMenuItem.findOne({ 
      href: "/demandorder/do" 
    });

    if (doMenuItem) {
      console.log("Found 'DO' menu item:", doMenuItem._id);
      
      // Update it to point to the correct path
      const result = await SidebarMenuItem.updateOne(
        { _id: doMenuItem._id },
        { 
          $set: { 
            href: "/ordermanagement/demandorders",
            label: "Place Orders",
            icon: "FaFileInvoice"
          } 
        }
      );
      
      console.log("✓ Updated DO menu item to point to /ordermanagement/demandorders");
      console.log(`  Modified: ${result.modifiedCount} document(s)`);
    } else {
      console.log("✗ DO menu item not found");
    }

    // Also update the parent menu name if needed
    const demandOrdersParent = await SidebarMenuItem.findOne({
      _id: new mongoose.Types.ObjectId("68ef0c679655dc4346b9fd89")
    });

    if (demandOrdersParent) {
      console.log("\nFound parent 'Demand Orders' menu:", demandOrdersParent._id);
      
      const result = await SidebarMenuItem.updateOne(
        { _id: demandOrdersParent._id },
        {
          $set: {
            label: "Order Management",
            icon: "FaShoppingCart"
          }
        }
      );
      
      console.log("✓ Updated parent menu to 'Order Management'");
      console.log(`  Modified: ${result.modifiedCount} document(s)`);
    }

    // Verify the changes
    console.log("\n--- Verification ---");
    const updatedDO = await SidebarMenuItem.findOne({ href: "/ordermanagement/demandorders" });
    if (updatedDO) {
      console.log("✓ DO menu now points to:", updatedDO.href);
      console.log("  Label:", updatedDO.label);
    }

    const updatedParent = await SidebarMenuItem.findOne({
      _id: new mongoose.Types.ObjectId("68ef0c679655dc4346b9fd89")
    });
    if (updatedParent) {
      console.log("✓ Parent menu label:", updatedParent.label);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixDemandOrderMenu();
