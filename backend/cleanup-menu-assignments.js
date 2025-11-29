const mongoose = require("mongoose");
require("dotenv").config();

async function cleanupMenuAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected");

    const roleMenuCollection = mongoose.connection.collection("role_sidebar_menu_items");

    // Check for assignments to the deleted menu ID
    const oldMenuId = new mongoose.Types.ObjectId("6923358a3036bc2c47a94afc");
    const oldAssignments = await roleMenuCollection
      .find({ sidebar_menu_item_id: oldMenuId })
      .toArray();

    console.log(`Found ${oldAssignments.length} role assignments to old distribution menu`);

    if (oldAssignments.length > 0) {
      const result = await roleMenuCollection.deleteMany({ sidebar_menu_item_id: oldMenuId });
      console.log(`✅ Deleted ${result.deletedCount} old menu assignments`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

cleanupMenuAssignments();
