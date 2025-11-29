const mongoose = require("mongoose");
require("dotenv").config();

async function checkSchedulingData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected");

    const Scheduling = mongoose.model(
      "Scheduling",
      new mongoose.Schema({}, { strict: false, collection: "schedulings" })
    );

    const schedulings = await Scheduling.find({}).lean();

    console.log(`\nFound ${schedulings.length} schedulings\n`);

    for (const scheduling of schedulings) {
      console.log(`Order: ${scheduling.order_number}`);
      console.log(`Status: ${scheduling.current_status}`);
      console.log(`Items:`);
      for (const item of scheduling.items) {
        console.log(
          `  - ${item.sku}: order_qty=${item.order_qty}, scheduled_qty=${item.scheduled_qty}, unscheduled_qty=${item.unscheduled_qty}`
        );
      }
      console.log(`Scheduling Details Count: ${scheduling.scheduling_details?.length || 0}`);
      console.log("---");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkSchedulingData();
