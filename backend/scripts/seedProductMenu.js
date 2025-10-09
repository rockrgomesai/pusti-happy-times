const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const { Role } = require("../src/models");
const { RoleSidebarMenuItem } = require("../src/models/JunctionTables");

const MENU_COLLECTION = "sidebar_menu_items";
const SYSTEM_ACTOR = "seed:product-menu";

const ensureMenuItem = async (filter, payload) => {
  const collection = mongoose.connection.collection(MENU_COLLECTION);
  const existing = await collection.findOne(filter);
  if (existing) {
    await collection.updateOne({ _id: existing._id }, { $set: payload });
    console.log(`✅ Menu item '${payload.label}' updated (id=${existing._id.toString()})`);
    return existing._id;
  }

  const { insertedId } = await collection.insertOne(payload);
  console.log(`🌱 Created menu item '${payload.label}' (id=${insertedId.toString()})`);
  return insertedId;
};

const ensureRoleAssignment = async (roleId, menuId) => {
  const existing = await RoleSidebarMenuItem.findOne({
    role_id: roleId,
    sidebar_menu_item_id: menuId,
  });

  if (existing) {
    console.log(
      `🔐 Role '${roleId.toString()}' already linked to menu '${menuId.toString()}'`
    );
    return existing;
  }

  const assignment = await RoleSidebarMenuItem.create({
    role_id: roleId,
    sidebar_menu_item_id: menuId,
  });

  console.log(
    `🔗 Linked role '${roleId.toString()}' with menu '${menuId.toString()}'`
  );
  return assignment;
};

const run = async () => {
  await connectDB();

  const parentFilter = { label: "Product", parent_id: null };
  const parentPayload = {
    label: "Product",
    href: "/product",
    m_order: 450,
    icon: "FaBox",
    parent_id: null,
    is_submenu: true,
    created_by: SYSTEM_ACTOR,
    updated_by: SYSTEM_ACTOR,
  };

  const parentId = await ensureMenuItem(parentFilter, parentPayload);

  const childFilter = { label: "Products", parent_id: parentId };
  const childPayload = {
    label: "Products",
    href: "/product/products",
    m_order: 451,
    icon: "FaBox",
    parent_id: parentId,
    is_submenu: false,
    created_by: SYSTEM_ACTOR,
    updated_by: SYSTEM_ACTOR,
  };

  const childId = await ensureMenuItem(childFilter, childPayload);

  const sysAdminRole = await Role.findOne({ role: "SysAdmin" });
  if (!sysAdminRole) {
    throw new Error("SysAdmin role not found. Seed role data before menu seeding.");
  }

  await ensureRoleAssignment(sysAdminRole._id, parentId);
  await ensureRoleAssignment(sysAdminRole._id, childId);

  console.log("✅ Product menu seeding complete");
};

run()
  .catch((error) => {
    console.error("❌ Failed to seed product menu", error);
    process.exitCode = 1;
  })
  .finally(() => {
    mongoose.connection.close();
  });
