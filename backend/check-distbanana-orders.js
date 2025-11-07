#!/usr/bin/env node

const mongoose = require("mongoose");
require("dotenv").config();

const { User, Distributor } = require("./src/models");
const DemandOrder = require("./src/models/DemandOrder");

async function checkDistbananaOrders() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected\n");

    // Find distbanana user
    const user = await User.findOne({ username: "distbanana" }).lean();

    if (!user) {
      console.log('❌ User "distbanana" not found!');
      process.exit(0);
    }

    console.log("👤 USER: distbanana");
    console.log("═".repeat(100));
    console.log(`ID: ${user._id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Distributor ID: ${user.distributor_id || "NOT SET ❌"}`);
    console.log("");

    if (!user.distributor_id) {
      console.log("⚠️  WARNING: User does not have a distributor_id!");
      console.log("   This means the query { distributor_id: user.distributor_id } will be:");
      console.log("   { distributor_id: undefined } or { distributor_id: null }");
      console.log("   Which will NOT match any orders!\n");

      // Check if there's a distributor with matching user info
      const possibleDist = await Distributor.findOne({
        $or: [{ email: user.email }, { mobile: user.mobile }],
      }).lean();

      if (possibleDist) {
        console.log("💡 FOUND a distributor that might belong to this user:");
        console.log(`   Distributor ID: ${possibleDist._id}`);
        console.log(`   Name: ${possibleDist.name}`);
        console.log(`   Email: ${possibleDist.email}`);
        console.log(`   Mobile: ${possibleDist.mobile}`);
        console.log(`   DB Point: ${possibleDist.db_point_id}`);
        console.log("\n   💡 TIP: You need to link this distributor to the user!");
        console.log(
          `   Run: db.users.updateOne({username: "distbanana"}, {$set: {distributor_id: ObjectId("${possibleDist._id}")}})`
        );
      }

      process.exit(0);
    }

    // Get distributor details
    const distributor = await Distributor.findById(user.distributor_id)
      .populate("db_point_id", "name type")
      .lean();

    if (!distributor) {
      console.log("❌ Distributor not found!");
      console.log(`   The user has distributor_id: ${user.distributor_id}`);
      console.log("   But no distributor exists with that ID!\n");
      process.exit(0);
    }

    console.log("🏪 DISTRIBUTOR:");
    console.log("─".repeat(100));
    console.log(`Name: ${distributor.name}`);
    console.log(`Email: ${distributor.email}`);
    console.log(`Mobile: ${distributor.mobile}`);
    console.log(`Segment: ${distributor.product_segment.join(", ")}`);
    console.log(`DB Point: ${distributor.db_point_id?.name || "N/A"}`);
    console.log(`Active: ${distributor.active}`);
    console.log("");

    // Check orders
    console.log("📋 CHECKING ORDERS:");
    console.log("─".repeat(100));

    const orders = await DemandOrder.find({ distributor_id: user.distributor_id })
      .select("order_number status total_amount created_at")
      .sort({ created_at: -1 })
      .lean();

    console.log(`Total orders for this distributor: ${orders.length}\n`);

    if (orders.length === 0) {
      console.log("⚠️  NO ORDERS FOUND for this distributor!\n");

      // Check if there are ANY orders in the system
      const totalOrders = await DemandOrder.countDocuments({});
      console.log(`Total orders in database: ${totalOrders}`);

      if (totalOrders > 0) {
        // Show sample orders with different distributor IDs
        const sampleOrders = await DemandOrder.find({})
          .limit(5)
          .select("order_number distributor_id status created_at")
          .populate("distributor_id", "name")
          .lean();

        console.log("\nSample orders (first 5):");
        sampleOrders.forEach((order, i) => {
          console.log(`   ${i + 1}. ${order.order_number}`);
          console.log(
            `      Distributor: ${order.distributor_id?.name || "N/A"} (ID: ${order.distributor_id?._id || order.distributor_id})`
          );
          console.log(`      Status: ${order.status}`);
          console.log(`      Created: ${order.created_at}`);
        });
      }
    } else {
      console.log("Orders found:");
      orders.forEach((order, i) => {
        console.log(`   ${i + 1}. ${order.order_number}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Amount: ৳${order.total_amount?.toFixed(2) || "0.00"}`);
        console.log(`      Created: ${order.created_at}`);
        console.log("");
      });
    }

    console.log("═".repeat(100));
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Connection closed");
    process.exit(0);
  }
}

checkDistbananaOrders();
