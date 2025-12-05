/**
 * Seed stock data for Dhaka Central Depot
 * Creates stock entries for items in approved schedulings
 *
 * Usage: node seed-depot-stock.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const models = require("./src/models");
const Scheduling = require("./src/models/Scheduling");

async function seedDepotStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Dhaka Central Depot ID
    const depotId = new mongoose.Types.ObjectId("68f2855dbdde87d90d1b9cf1");

    console.log("=== SEEDING STOCK FOR DHAKA CENTRAL DEPOT ===\n");

    // Get all approved schedulings for this depot to know what items to stock
    const schedulings = await Scheduling.find({
      depot_id: depotId,
      current_status: "Approved",
    }).lean();

    console.log(`Found ${schedulings.length} approved schedulings\n`);

    // Collect all unique items from scheduling_details
    const itemMap = new Map();

    schedulings.forEach((scheduling) => {
      if (scheduling.scheduling_details) {
        scheduling.scheduling_details.forEach((detail) => {
          const itemId = detail.item_id.toString();
          if (!itemMap.has(itemId)) {
            itemMap.set(itemId, {
              item_id: detail.item_id,
              sku: detail.sku,
              product_name: detail.product_name,
              required_qty: detail.delivery_qty,
            });
          } else {
            // Add to required quantity
            const existing = itemMap.get(itemId);
            existing.required_qty += detail.delivery_qty;
          }
        });
      }
    });

    console.log(`Found ${itemMap.size} unique items\n`);

    // Create stock entries with 150% of required quantity
    let createdCount = 0;
    let updatedCount = 0;

    for (const [itemId, itemInfo] of itemMap.entries()) {
      const stockQty = Math.ceil(itemInfo.required_qty * 1.5); // 150% of required

      const existing = await models.DepotStock.findOne({
        depot_id: depotId,
        product_id: itemId,
      });

      if (existing) {
        await models.DepotStock.updateOne(
          { _id: existing._id },
          {
            $set: {
              qty_ctn: stockQty,
              updated_at: new Date(),
            },
          }
        );
        console.log(`✓ Updated: ${itemInfo.sku} - ${stockQty} units`);
        updatedCount++;
      } else {
        await models.DepotStock.create({
          depot_id: depotId,
          product_id: itemId,
          qty_ctn: stockQty,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(
          `✓ Created: ${itemInfo.sku} - ${stockQty} units (required: ${itemInfo.required_qty})`
        );
        createdCount++;
      }
    }

    console.log("\n=== SUMMARY ===");
    console.log(`Created: ${createdCount} stock entries`);
    console.log(`Updated: ${updatedCount} stock entries`);
    console.log(`Total items stocked: ${itemMap.size}`);

    // Show total stock
    const totalStock = await models.DepotStock.find({ depot_id: depotId });
    const totalQty = totalStock.reduce((sum, s) => {
      const qty = s.qty_ctn ? parseFloat(s.qty_ctn.toString()) : 0;
      return sum + qty;
    }, 0);
    console.log(
      `\n✓ Dhaka Central Depot now has ${totalStock.length} items with total ${totalQty} units`
    );

    // Show details
    console.log(`\nStock Details:`);
    totalStock.forEach((s) => {
      const qty = s.qty_ctn ? parseFloat(s.qty_ctn.toString()) : 0;
      console.log(`  Product ${s.product_id}: ${qty} units`);
    });

    await mongoose.connection.close();
    console.log("\n✓ Done - Stock seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

seedDepotStock();
