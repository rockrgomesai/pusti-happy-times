const mongoose = require("mongoose");

// Connect to MongoDB
mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const SidebarMenuItem = mongoose.model(
  "SidebarMenuItem",
  new mongoose.Schema({}, { strict: false }),
  "sidebar_menu_items"
);

async function fixLoadSheetsMenuPath() {
  try {
    // Update all menu items that have /distribution/load-sheets to /inventory/load-sheets
    const result = await SidebarMenuItem.updateMany(
      { href: { $regex: /^\/distribution\/load-sheets/ } },
      [
        {
          $set: {
            href: {
              $replaceOne: {
                input: "$href",
                find: "/distribution/load-sheets",
                replacement: "/inventory/load-sheets",
              },
            },
          },
        },
      ]
    );

    console.log(`✅ Updated ${result.modifiedCount} menu items`);

    // List updated items
    const updatedItems = await SidebarMenuItem.find({
      href: { $regex: /^\/inventory\/load-sheets/ },
    });

    console.log("\n📋 Updated menu items:");
    updatedItems.forEach((item) => {
      console.log(`  - ${item.label}: ${item.href}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

fixLoadSheetsMenuPath();
