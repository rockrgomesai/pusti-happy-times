const { MongoClient } = require("mongodb");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function setupApprovedOrders() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // 1. Find Finance role
    const financeRole = await db.collection("roles").findOne({ role: "Finance" });
    if (!financeRole) {
      console.error("❌ Finance role not found");
      process.exit(1);
    }
    console.log("✅ Found Finance role:", financeRole._id);

    // 2. Find Order Management parent menu
    const orderMgmtMenu = await db.collection("sidebar_menu_items").findOne({
      label: "Order Management",
      is_submenu: false,
    });
    if (!orderMgmtMenu) {
      console.error("❌ Order Management menu not found");
      process.exit(1);
    }
    console.log("✅ Found Order Management menu:", orderMgmtMenu._id);

    // 3. Create or find page permission
    const permissionName = "pg:ordermanagement:approvedorders";
    let pagePermission = await db.collection("pg_permissions").findOne({
      pg_permissions: permissionName,
    });

    if (!pagePermission) {
      const permResult = await db.collection("pg_permissions").insertOne({
        pg_permissions: permissionName,
      });
      pagePermission = { _id: permResult.insertedId, pg_permissions: permissionName };
      console.log("✅ Created page permission:", pagePermission._id);
    } else {
      console.log("✅ Page permission already exists:", pagePermission._id);
    }

    // 4. Assign page permission to Finance role
    const existingRolePerm = await db.collection("role_pg_permissions").findOne({
      role_id: financeRole._id,
      pg_permission_id: pagePermission._id,
    });

    if (!existingRolePerm) {
      await db.collection("role_pg_permissions").insertOne({
        role_id: financeRole._id,
        pg_permission_id: pagePermission._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✅ Assigned page permission to Finance role");
    } else {
      console.log("ℹ️  Page permission already assigned to Finance role");
    }

    // 5. Calculate next m_order for submenu
    const existingSubmenus = await db
      .collection("sidebar_menu_items")
      .find({ parent_id: orderMgmtMenu._id, is_submenu: true })
      .toArray();

    const maxOrder = existingSubmenus.reduce((max, item) => {
      return item.m_order > max ? item.m_order : max;
    }, 0);

    const nextOrder = maxOrder + 1;

    // 6. Create menu item
    const menuLabel = "Approved Orders";
    let menuItem = await db.collection("sidebar_menu_items").findOne({
      label: menuLabel,
      parent_id: orderMgmtMenu._id,
    });

    if (!menuItem) {
      const menuResult = await db.collection("sidebar_menu_items").insertOne({
        label: menuLabel,
        href: "/ordermanagement/approvedorders",
        m_order: nextOrder,
        icon: "FaCheckCircle",
        parent_id: orderMgmtMenu._id,
        is_submenu: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      menuItem = { _id: menuResult.insertedId, label: menuLabel };
      console.log("✅ Created menu item:", menuItem._id);
    } else {
      console.log("✅ Menu item already exists:", menuItem._id);
    }

    // 7. Assign menu to Finance role
    const existingRoleMenu = await db.collection("role_sidebar_menu_items").findOne({
      role_id: financeRole._id,
      sidebar_menu_item_id: menuItem._id,
    });

    if (!existingRoleMenu) {
      await db.collection("role_sidebar_menu_items").insertOne({
        role_id: financeRole._id,
        sidebar_menu_item_id: menuItem._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✅ Assigned menu to Finance role");
    } else {
      console.log("ℹ️  Menu already assigned to Finance role");
    }

    console.log("\n✅ Setup completed successfully!");
    console.log('Finance role can now access "Approved Orders" under Order Management');
  } catch (error) {
    console.error("❌ Error during setup:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupApprovedOrders();
