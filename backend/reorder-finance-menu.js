const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function reorderMenuItems() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log("🔄 Starting menu reordering...\n");

    // Update Approved Orders to 5.4 (right after Approve Orders at 5.3)
    const approvedOrdersId = new ObjectId("6928c8b914c9b548585059da");

    await db.collection("sidebar_menu_items").updateOne(
      { _id: approvedOrdersId },
      {
        $set: {
          m_order: 5.4,
          updated_at: new Date(),
        },
      }
    );

    console.log('✅ Updated "Approved Orders" m_order to 5.4');

    // Verify the new order
    const financeRole = await db.collection("roles").findOne({ role: "Finance" });
    const roleMenuItems = await db
      .collection("role_sidebar_menu_items")
      .find({ role_id: financeRole._id })
      .toArray();

    const menuIds = roleMenuItems.map((r) => r.sidebar_menu_item_id);
    const menus = await db
      .collection("sidebar_menu_items")
      .find({ _id: { $in: menuIds } })
      .toArray();

    const orderMgmt = menus.find((m) => m.label === "Order Management");
    const submenus = menus
      .filter((m) => m.parent_id && m.parent_id.equals(orderMgmt._id))
      .sort((a, b) => a.m_order - b.m_order);

    console.log("\n📋 New Order Management menu order:");
    submenus.forEach((s) => {
      console.log(`  ${s.m_order}: ${s.label}`);
    });

    console.log("\n✅ Menu reordering completed successfully!");
    console.log("Finance users should refresh their browser to see the new order.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

reorderMenuItems();
