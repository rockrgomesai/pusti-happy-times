const mongoose = require("mongoose");
require("dotenv").config();

const Scheduling = require("./src/models/Scheduling");

async function checkSchedulingDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const schedulings = await Scheduling.find({ current_status: "Finance-to-approve" }).lean();

    console.log(`Found ${schedulings.length} schedulings with status "Finance-to-approve"\n`);

    schedulings.forEach((s) => {
      console.log(`📦 Order: ${s.order_number}`);
      console.log(`   Status: ${s.current_status}`);
      console.log(`   Scheduling Details: ${s.scheduling_details?.length || 0}`);

      if (s.scheduling_details && s.scheduling_details.length > 0) {
        s.scheduling_details.forEach((detail, idx) => {
          console.log(
            `     ${idx + 1}. ${detail.sku}: qty=${detail.delivery_qty}, approval_status="${detail.approval_status || "undefined"}"`
          );
        });

        const hasPending = s.scheduling_details.some(
          (d) => !d.approval_status || d.approval_status === "Pending"
        );
        console.log(`   Has pending details: ${hasPending}`);
      }
      console.log("---");
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkSchedulingDetails();
