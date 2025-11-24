const mongoose = require("mongoose");
const DemandOrder = require("./src/models/DemandOrder");
const User = require("./src/models/User");
const Role = require("./src/models/Role");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("✅ Connected to MongoDB\n");

    // Check orders in distribution-related statuses
    const orders = await DemandOrder.find({
      status: {
        $in: ["forwarded_to_distribution", "scheduling_in_progress", "scheduling_completed"],
      },
    })
      .select("_id order_number status current_approver_id current_approver_role")
      .lean();

    console.log(`📦 Found ${orders.length} orders with distribution-related status:\n`);
    for (const order of orders) {
      console.log(`Order: ${order.order_number}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Assigned to User ID: ${order.current_approver_id || "NONE"}`);
      console.log(`  Assigned Role: ${order.current_approver_role || "NONE"}\n`);
    }

    // Find Distribution users
    const distributionRole = await Role.findOne({ role: "Distribution" });
    if (distributionRole) {
      const distributionUsers = await User.find({ role_id: distributionRole._id })
        .select("username email active")
        .lean();

      console.log(`\n👥 Distribution users in system (${distributionUsers.length}):`);
      distributionUsers.forEach((u) => {
        console.log(`  - ${u.username} (${u.email}) - ${u.active ? "Active" : "Inactive"}`);
      });
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
