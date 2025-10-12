/**
 * Distributor Seed Script
 * Inserts a single baseline distributor aligned with the strict contract.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const { connectDB } = require("../config/database");
const { Distributor, Territory, Depot, User } = require("../models");

const DECIMAL_ZERO = () => mongoose.Types.Decimal128.fromString("0.00");

const TERRITORY_NAMES = {
  zone: "Seed Zone",
  region: "Seed Region",
  area: "Seed Area",
  dbPoint: "Seed DB Point",
};

const DEPOT_NAME = "Seed Depot";

async function resolveAuthor() {
  const user = await User.findOne().select(["_id", "username"]).lean();
  if (!user) {
    throw new Error("No users found. Seed users before distributors.");
  }
  return user._id;
}

async function ensureTerritoryHierarchy(authorId) {
  const ensureTerritory = async (name, type, parentDoc) => {
    let territory = await Territory.findOne({ name, type });
    if (territory) {
      return territory;
    }

    territory = new Territory({
      name,
      type,
      parent_id: parentDoc ? parentDoc._id : null,
      created_by: authorId,
      updated_by: authorId,
    });

    await territory.save();
    return territory;
  };

  const zone = await ensureTerritory(TERRITORY_NAMES.zone, "zone", null);
  const region = await ensureTerritory(TERRITORY_NAMES.region, "region", zone);
  const area = await ensureTerritory(TERRITORY_NAMES.area, "area", region);
  const dbPoint = await ensureTerritory(TERRITORY_NAMES.dbPoint, "db_point", area);

  return { zone, region, area, dbPoint };
}

async function resolveDbPoint(authorId) {
  const existing = await Territory.findOne({ type: "db_point" })
    .select(["_id", "name"])
    .lean();
  if (existing) {
    return existing;
  }

  const { dbPoint } = await ensureTerritoryHierarchy(authorId);
  return { _id: dbPoint._id, name: dbPoint.name };
}

async function resolveDepot(authorId) {
  const depot = await Depot.findOne().select(["_id", "name"]).lean();
  if (depot) {
    return depot._id;
  }

  const createdDepot = await Depot.create({
    name: DEPOT_NAME,
    created_by: authorId,
    updated_by: authorId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return createdDepot._id;
}

async function run() {
  try {
    await connectDB();
    await Distributor.init();

    const authorId = await resolveAuthor();
    const dbPoint = await resolveDbPoint(authorId);
    const deliveryDepotId = await resolveDepot(authorId);

    const seedName = "Sample General Distributor";

    const existing = await Distributor.findOne({ name: seedName }).lean();
    if (existing) {
      console.log(
        `✅ Distributor "${seedName}" already exists with _id=${existing._id.toString()}`
      );
      return;
    }

    const now = new Date();

    const payload = {
      name: seedName,
      db_point_id: dbPoint._id,
      product_segment: ["BIS"],
      skus_exclude: [],
      distributor_type: "General Distributor",
      erp_id: 1001,
      mobile: "+8801712345678",
      credit_limit: DECIMAL_ZERO(),
      bank_guarantee: DECIMAL_ZERO(),
      delivery_depot_id: deliveryDepotId,
      proprietor: "Demo Proprietor",
      proprietor_dob: new Date("1985-01-15"),
      registration_date: now,
      computer: "Yes",
      printer: "No",
      emergency_contact: "Jane Doe",
      emergency_relation: "Manager",
      emergency_mobile: "+8801811122233",
      unit: "CTN",
      latitude: "23.7808",
      longitude: "90.2794",
      address: "House 00, Road 0, Dhaka",
      note: "Seed distributor record for initial setup.",
      active: true,
      created_by: authorId,
      updated_by: authorId,
    };

    const distributor = await Distributor.create(payload);

    console.log(
      `🌱 Inserted distributor "${distributor.name}" with _id=${distributor._id.toString()}`
    );
  } catch (error) {
    console.error("❌ Distributor seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.warn("⚠️ Unable to close MongoDB connection cleanly", closeError.message);
    }
  }
}

run();
