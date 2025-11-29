const mongoose = require("mongoose");
require("dotenv").config();

async function fixSchedulingMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected");

    const collection = mongoose.connection.collection("sidebar_menu_items");

    // Find the old distribution menu
    const oldMenu = await collection.findOne({ href: "/ordermanagement/distribution" });
    console.log("Old distribution menu:", oldMenu);

    // Find the schedulings menu
    const schedulingsMenu = await collection.findOne({ href: "/ordermanagement/schedulings" });
    console.log("Schedulings menu:", schedulingsMenu);

    if (oldMenu && !schedulingsMenu) {
      // Update the old menu to point to schedulings
      await collection.updateOne(
        { _id: oldMenu._id },
        { $set: { href: "/ordermanagement/schedulings", label: "Schedulings" } }
      );
      console.log("✅ Updated distribution menu to schedulings");
    } else if (oldMenu && schedulingsMenu) {
      // Delete the old menu since we have the new one
      await collection.deleteOne({ _id: oldMenu._id });
      console.log("✅ Deleted old distribution menu");
    } else if (!oldMenu && schedulingsMenu) {
      console.log("✅ Already correct - only schedulings menu exists");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

fixSchedulingMenu();
