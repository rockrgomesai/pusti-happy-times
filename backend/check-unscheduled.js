const mongoose = require("mongoose");
require("dotenv").config();

const Scheduling = require("./src/models/Scheduling");

async function checkUnscheduledItems() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const schedulings = await Scheduling.find().lean();

    schedulings.forEach((s) => {
      console.log(`📦 Order: ${s.order_number} (Status: ${s.current_status})`);
      console.log(`Items:`);
      s.items.forEach((item) => {
        console.log(
          `  - ${item.sku}: Order=${item.order_qty}, Scheduled=${item.scheduled_qty}, Unscheduled=${item.unscheduled_qty}`
        );
      });
      console.log(`Scheduling Details: ${s.scheduling_details?.length || 0} batches`);
      console.log("---");
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUnscheduledItems();
