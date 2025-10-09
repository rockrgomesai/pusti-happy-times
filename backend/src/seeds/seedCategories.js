/**
 * Category Seed Script
 * Creates baseline product categories for initial environments.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const { connectDB } = require("../config/database");
const { Category } = require("../models");

const ROOT_SEEDS = [
  { name: "Biscuits", product_segment: "BIS" },
  { name: "Beverages", product_segment: "BEV" },
];

async function run() {
  try {
    await connectDB();
    await Category.init();

    for (const seed of ROOT_SEEDS) {
      const existing = await Category.findOne({ name: seed.name });
      if (existing) {
        console.log(
          `✅ Category "${seed.name}" already exists with _id = ${existing._id.toString()}`
        );
        continue;
      }

      const now = new Date();
      const category = await Category.create({
        name: seed.name,
        parent_id: null,
        product_segment: seed.product_segment,
        active: true,
        created_at: now,
        updated_at: now,
        created_by: "system",
        updated_by: "system",
      });

      console.log(
        `🌱 Inserted seed category "${category.name}" with _id = ${category._id.toString()}`
      );
    }
  } catch (error) {
    console.error("❌ Category seed failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️  Unable to close MongoDB connection", closeError.message);
      }
    }
  }
}

run();
