const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("Connected to MongoDB\n");

    const SidebarMenuItem = mongoose.model(
      "SidebarMenuItem",
      new mongoose.Schema({}, { strict: false, collection: "sidebar_menu_items" })
    );

    // Remove Delivery Invoices menu item
    const result = await SidebarMenuItem.deleteOne({
      href: "/inventory/delivery-invoices",
    });

    console.log(`Deleted ${result.deletedCount} menu item(s) for Delivery Invoices`);

    await mongoose.disconnect();
    console.log("\nDisconnected");
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
