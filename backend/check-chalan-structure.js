const mongoose = require("mongoose");
const models = require("./src/models");

async function checkChalanStructure() {
  try {
    await mongoose.connect("mongodb://localhost:27017/pusti_happy_times");
    console.log("Connected to MongoDB");

    const chalan = await models.DeliveryChalan.findOne({
      chalan_no: "3333-CHN-20251204-281840",
    }).lean();

    console.log("\n=== LEAN CHALAN STRUCTURE ===");
    console.log("Chalan ID:", chalan._id);
    console.log("Chalan No:", chalan.chalan_no);
    console.log("Items count:", chalan.items?.length);

    if (chalan.items && chalan.items.length > 0) {
      console.log("\n=== FIRST ITEM ===");
      console.log(JSON.stringify(chalan.items[0], null, 2));

      console.log("\n=== ITEM FIELDS ===");
      console.log("sku:", chalan.items[0].sku);
      console.log("qty_ctn type:", typeof chalan.items[0].qty_ctn);
      console.log("qty_ctn value:", chalan.items[0].qty_ctn);
      console.log("qty_ctn toString:", chalan.items[0].qty_ctn?.toString?.());
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkChalanStructure();
