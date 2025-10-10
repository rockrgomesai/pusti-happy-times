const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const {
  Brand,
  Category,
  Depot,
  Product,
  Role,
  ApiPermission,
} = require("../src/models");
const { RoleApiPermission } = require("../src/models/JunctionTables");

const SYSTEM_OBJECT_ID = new mongoose.Types.ObjectId("000000000000000000000001");
const SYSTEM_ACTOR = "system";

const PRODUCT_PERMISSIONS = [
  "products:read",
  "products:create",
  "products:update",
  "products:delete",
];

async function ensureBrand(name) {
  const existing = await Brand.findOne({ brand: name });
  if (existing) {
    console.log(`✅ Brand '${name}' ready (id=${existing._id.toString()})`);
    return existing;
  }

  const now = new Date();
  const brand = await Brand.create({
    brand: name,
    created_at: now,
    updated_at: now,
    created_by: SYSTEM_OBJECT_ID,
    updated_by: SYSTEM_OBJECT_ID,
  });
  console.log(`🌱 Created brand '${name}' (id=${brand._id.toString()})`);
  return brand;
}

async function ensureCategory(name, segment) {
  const existing = await Category.findOne({ name });
  if (existing) {
    console.log(`✅ Category '${name}' ready (id=${existing._id.toString()})`);
    return existing;
  }

  const now = new Date();
  const category = await Category.create({
    name,
    parent_id: null,
    product_segment: segment,
    active: true,
    created_at: now,
    updated_at: now,
    created_by: SYSTEM_ACTOR,
    updated_by: SYSTEM_ACTOR,
  });
  console.log(`🌱 Created category '${name}' (id=${category._id.toString()})`);
  return category;
}

async function ensureDepot(name) {
  const existing = await Depot.findOne({ name });
  if (existing) {
    console.log(`✅ Depot '${name}' ready (id=${existing._id.toString()})`);
    return existing;
  }

  const now = new Date();
  const depot = await Depot.create({
    name,
    created_at: now,
    updated_at: now,
    created_by: SYSTEM_OBJECT_ID,
    updated_by: SYSTEM_OBJECT_ID,
  });
  console.log(`🌱 Created depot '${name}' (id=${depot._id.toString()})`);
  return depot;
}

async function ensureRole(name) {
  const existing = await Role.findOne({ role: name });
  if (existing) {
    console.log(`✅ Role '${name}' ready (id=${existing._id.toString()})`);
    return existing;
  }

  const role = await Role.create({ role: name, active: true });
  console.log(`🌱 Created role '${name}' (id=${role._id.toString()})`);
  return role;
}

async function ensureApiPermission(code) {
  const existing = await ApiPermission.findOne({ api_permissions: code });
  if (existing) {
    console.log(`✅ API permission '${code}' ready (id=${existing._id.toString()})`);
    return existing;
  }

  const permission = await ApiPermission.create({ api_permissions: code });
  console.log(
    `🌱 Created API permission '${code}' (id=${permission._id.toString()})`
  );
  return permission;
}

async function assignPermissionsToRole(role, permissions) {
  for (const permission of permissions) {
    const exists = await RoleApiPermission.findOne({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    if (exists) {
      console.log(
        `✅ Role '${role.role}' already has permission '${permission.api_permissions}'`
      );
      continue;
    }

    await RoleApiPermission.create({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    console.log(
      `🔗 Granted '${permission.api_permissions}' to role '${role.role}'`
    );
  }
}

async function ensureProduct(doc) {
  const existing = await Product.findOne({ sku: doc.sku });
  if (existing) {
    console.log(`✅ Product '${doc.sku}' already present`);
    return existing;
  }

  const product = await Product.create(doc);
  console.log(`📦 Inserted product '${product.sku}' (${product.product_type})`);
  return product;
}

async function seedProducts() {
  await connectDB();

  const [coreBrand, importedBrand] = await Promise.all([
    ensureBrand("Pusti Core"),
    ensureBrand("Pusti Imports"),
  ]);

  const [snackCategory, beverageCategory] = await Promise.all([
    ensureCategory("Manufactured Snacks", "BIS"),
    ensureCategory("Imported Essentials", "BEV"),
  ]);

  const manufacturingDepot = await ensureDepot("Pusti Dhaka Depot");

  const now = new Date();
  const actor = "seed:products";

  const manufacturedProducts = [
    {
      product_type: "MANUFACTURED",
      brand_id: coreBrand._id,
      category_id: snackCategory._id,
  depot_ids: [manufacturingDepot._id],
      sku: "PST-MFG-001",
      unit: "BOX",
      trade_price: 120,
      db_price: 110,
      mrp: 150,
      ctn_pcs: 24,
      wt_pcs: 12.5,
  name: "Pusti Crunch Wafer",
  description: "Layered chocolate wafer manufactured locally in Dhaka plant.",
      launch_date: new Date("2024-01-05"),
      image_url: null,
      bangla_name: "পুষ্টি ক্রাঞ্চ ওয়াফার",
      active: true,
      created_at: now,
      updated_at: now,
      created_by: actor,
      updated_by: actor,
    },
    {
      product_type: "MANUFACTURED",
      brand_id: coreBrand._id,
      category_id: snackCategory._id,
  depot_ids: [manufacturingDepot._id],
      sku: "PST-MFG-002",
      unit: "CTN",
      trade_price: 220,
      db_price: 205,
      mrp: 260,
      ctn_pcs: 12,
      wt_pcs: 18.75,
  name: "Pusti Nutri Biscuit",
  description: "High fibre biscuits produced in ISO certified facility.",
      launch_date: new Date("2024-06-15"),
      image_url: null,
      bangla_name: "পুষ্টি নিউট্রিবিস্কুট",
      active: true,
      created_at: now,
      updated_at: now,
      created_by: actor,
      updated_by: actor,
    },
  ];

  const procuredProducts = [
    {
      product_type: "PROCURED",
      brand_id: importedBrand._id,
      category_id: beverageCategory._id,
  depot_ids: [],
      sku: "PST-PRC-001",
      unit: "PCS",
      trade_price: 85,
      db_price: null,
      mrp: null,
      ctn_pcs: null,
      wt_pcs: 1,
  name: "Pusti Kenyan Tea Pack",
  description: "Premium imported black tea sourced from Kenyan highlands.",
      launch_date: null,
      decommission_date: null,
      image_url: null,
      bangla_name: null,
      active: true,
      created_at: now,
      updated_at: now,
      created_by: actor,
      updated_by: actor,
    },
    {
      product_type: "PROCURED",
      brand_id: importedBrand._id,
      category_id: beverageCategory._id,
  depot_ids: [],
      sku: "PST-PRC-002",
      unit: "PCS",
      trade_price: 95,
      db_price: null,
      mrp: null,
      ctn_pcs: null,
      wt_pcs: 0.75,
  name: "Pusti Organic Honey",
  description: "Glass jar of certified organic honey sourced internationally.",
      launch_date: null,
      decommission_date: null,
      image_url: null,
      bangla_name: null,
      active: true,
      created_at: now,
      updated_at: now,
      created_by: actor,
      updated_by: actor,
    },
  ];

  for (const dataSet of [...manufacturedProducts, ...procuredProducts]) {
    await ensureProduct(dataSet);
  }

  const sysAdminRole = await ensureRole("SysAdmin");

  const permissionDocs = [];
  for (const code of PRODUCT_PERMISSIONS) {
    const permission = await ensureApiPermission(code);
    permissionDocs.push(permission);
  }

  await assignPermissionsToRole(sysAdminRole, permissionDocs);

  console.log("\n✅ Product seeding completed successfully");
}

seedProducts()
  .catch((error) => {
    console.error("❌ Product seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
      console.log("🔌 MongoDB connection closed");
    } catch (closeError) {
      console.warn("⚠️ Unable to close MongoDB connection cleanly", closeError);
    }
  });
