/**
 * Add DO List Menu Items - Simple Direct Insert
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const setup = async () => {
  try {
    console.log("\n🚀 Adding DO List Menu Items...\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    const db = mongoose.connection.db;

    // Get user for audit
    const user =
      (await db.collection("users").findOne({ username: "superadmin" })) ||
      (await db.collection("users").findOne({}));

    if (!user) {
      console.error("❌ No users found");
      process.exit(1);
    }

    // Get roles
    const roles = await db
      .collection("roles")
      .find({
        role: { $in: ["ASM", "RSM", "SuperAdmin"] },
      })
      .toArray();

    const roleIds = roles.map((r) => r._id);
    console.log(`Found ${roles.length} roles for menu access`);

    // Menu items with minimal required fields
    const menuItems = [
      {
        label: "DO List",
        href: "/demandorder/do-list",
        m_order: 150,
        icon: "ListAlt",
        parent_id: null,
        is_submenu: false,
      },
      {
        label: "My DO List",
        href: "/demandorder/my-do-list",
        m_order: 151,
        icon: "PersonOutline",
        parent_id: null,
        is_submenu: false,
      },
    ];

    const menuCollection = db.collection("sidebar_menu_items");

    for (const item of menuItems) {
      const exists = await menuCollection.findOne({ label: item.label });

      if (exists) {
        console.log(`⚠️  Menu already exists: ${item.label}`);
      } else {
        const result = await menuCollection.insertOne(item);
        console.log(`✅ Created menu: ${item.label} (${result.insertedId})`);

        // Grant access to roles
        const roleMenuCollection = db.collection("role_sidebar_menu_items");

        for (const roleId of roleIds) {
          await roleMenuCollection.insertOne({
            role_id: roleId,
            sidebar_menu_item_id: result.insertedId,
          });
        }

        console.log(`   ✅ Granted access to ${roleIds.length} roles`);
      }
    }

    console.log("\n✅ Menu items setup complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
};

setup();
