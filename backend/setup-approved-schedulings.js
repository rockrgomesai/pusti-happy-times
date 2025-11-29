const { MongoClient } = require("mongodb");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function setupApprovedSchedulings() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // 1. Find Finance role
    const financeRole = await db.collection("roles").findOne({ role: "Finance" });
    if (!financeRole) {
      console.error("❌ Finance role not found");
      return;
    }
    console.log("✅ Found Finance role:", financeRole._id);

    // 2. Find Order Management parent menu
    const orderMgmtMenu = await db.collection("sidebar_menu_items").findOne({
      label: "Order Management",
      is_submenu: false,
    });
    if (!orderMgmtMenu) {
      console.error("❌ Order Management menu not found");
      return;
    }
    console.log("✅ Found Order Management menu:", orderMgmtMenu._id);

    // 3. Create or find page permission
    const permissionName = "pg:ordermanagement:approvedschedulings";
    let pagePermission = await db.collection("pg_permissions").findOne({
      pg_permissions: permissionName,
    });

    let permissionId;
    if (pagePermission) {
      console.log("✅ Page permission already exists:", pagePermission._id);
      permissionId = pagePermission._id;
    } else {
      const permResult = await db.collection("pg_permissions").insertOne({
        pg_permissions: permissionName,
      });
      permissionId = permResult.insertedId;
      console.log("✅ Created page permission:", permissionId);
    }

    // 4. Assign page permission to Finance role
    const existingRolePagePerm = await db.collection("role_pg_permissions").findOne({
      role_id: financeRole._id,
      pg_permission_id: permissionId,
    });

    if (!existingRolePagePerm) {
      await db.collection("role_pg_permissions").insertOne({
        role_id: financeRole._id,
        pg_permission_id: permissionId,
        created_at: new Date(),
      });
      console.log("✅ Assigned page permission to Finance role");
    } else {
      console.log("⚠️  Page permission already assigned to Finance role");
    }

    // 5. Get the highest m_order in Order Management submenu
    const maxOrderItem = await db
      .collection("sidebar_menu_items")
      .find({ parent_id: orderMgmtMenu._id })
      .sort({ m_order: -1 })
      .limit(1)
      .toArray();

    const nextOrder = maxOrderItem.length > 0 ? maxOrderItem[0].m_order + 1 : 1;

    // 6. Create menu item
    const menuItem = {
      label: "Approved Schedules",
      href: "/ordermanagement/approvedschedulings",
      m_order: nextOrder,
      icon: "FaCheckCircle",
      parent_id: orderMgmtMenu._id,
      is_submenu: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const existingMenu = await db.collection("sidebar_menu_items").findOne({
      href: menuItem.href,
    });

    let menuId;
    if (existingMenu) {
      console.log("⚠️  Menu item already exists:", existingMenu._id);
      menuId = existingMenu._id;
    } else {
      const menuResult = await db.collection("sidebar_menu_items").insertOne(menuItem);
      menuId = menuResult.insertedId;
      console.log("✅ Created menu item:", menuId);
    }

    // 7. Assign menu to Finance role
    const existingRoleMenu = await db.collection("role_sidebar_menu_items").findOne({
      role_id: financeRole._id,
      sidebar_menu_item_id: menuId,
    });

    if (!existingRoleMenu) {
      await db.collection("role_sidebar_menu_items").insertOne({
        role_id: financeRole._id,
        sidebar_menu_item_id: menuId,
        created_at: new Date(),
      });
      console.log("✅ Assigned menu to Finance role");
    } else {
      console.log("⚠️  Menu already assigned to Finance role");
    }

    console.log("\n✅ Setup completed successfully!");
    console.log('Finance role can now access "Approved Schedules" under Order Management');
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

setupApprovedSchedulings();
