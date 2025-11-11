/**
 * Test Collection Notifications
 * Verifies that notifications are properly sent for collection workflow
 */

const mongoose = require("mongoose");
const Collection = require("./src/models/Collection");
const Notification = require("./src/models/Notification");
const {
  notifyDistributor,
  notifyNextHandler,
  notifyDistributorOfEdit,
} = require("./src/utils/collectionNotifications");

async function testNotifications() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect("mongodb://localhost:27017/pusti_happy_times");
    console.log("✅ Connected to MongoDB\n");

    // Find a test collection (or create one)
    let collection = await Collection.findOne().populate("distributor_id");

    if (!collection) {
      console.log("❌ No collections found in database");
      console.log("💡 Please create a collection first through the UI");
      await mongoose.disconnect();
      return;
    }

    console.log(`📦 Testing with collection: ${collection.transaction_id}`);
    console.log(`   Distributor: ${collection.distributor_id?.name || "N/A"}`);
    console.log(`   Status: ${collection.approval_status}`);
    console.log(`   Amount: ${collection.deposit_amount}\n`);

    // Test 1: Notify distributor about forward
    console.log("🔔 Test 1: Notify distributor about forward...");
    const notification1 = await notifyDistributor(
      collection,
      "forwarded",
      "Test ASM",
      "Testing forward notification"
    );
    console.log(notification1 ? "✅ Success" : "❌ Failed");
    console.log("");

    // Test 2: Notify next handler
    console.log("🔔 Test 2: Notify next handler (RSM)...");
    const notifications2 = await notifyNextHandler(
      collection,
      "RSM",
      "Test ASM",
      "Testing next handler notification"
    );
    console.log(`✅ Sent to ${notifications2.length} RSM users`);
    console.log("");

    // Test 3: Notify distributor about cancellation
    console.log("🔔 Test 3: Notify distributor about cancellation...");
    const notification3 = await notifyDistributor(
      collection,
      "cancelled",
      "Test Finance",
      "Testing cancellation notification - invalid bank details"
    );
    console.log(notification3 ? "✅ Success" : "❌ Failed");
    console.log("");

    // Test 4: Notify distributor about approval
    console.log("🔔 Test 4: Notify distributor about approval...");
    const notification4 = await notifyDistributor(
      collection,
      "approved",
      "Test Finance",
      "Testing approval notification"
    );
    console.log(notification4 ? "✅ Success" : "❌ Failed");
    console.log("");

    // Test 5: Notify distributor about edit
    console.log("🔔 Test 5: Notify distributor about edit...");
    const notification5 = await notifyDistributorOfEdit(
      collection,
      "Test Order Management",
      "Updated DO number"
    );
    console.log(notification5 ? "✅ Success" : "❌ Failed");
    console.log("");

    // Check all notifications created
    console.log("📊 Checking notifications in database...");
    const allNotifications = await Notification.find({
      collection_id: collection._id,
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${allNotifications.length} notifications for this collection:\n`);
    allNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title}`);
      console.log(`   Type: ${notif.type} | Priority: ${notif.priority}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   Read: ${notif.read}`);
      console.log("");
    });

    console.log("✅ All notification tests completed!");
  } catch (error) {
    console.error("❌ Error testing notifications:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

testNotifications();
