const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkMenuOrder() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    // Find Finance role
    const financeRole = await db.collection("roles").findOne({ role: "Finance" });

    // Find all menu items for Finance
    const roleMenuItems = await db
      .collection("role_sidebar_menu_items")
      .find({ role_id: financeRole._id })
      .toArray();

    const menuIds = roleMenuItems.map((r) => r.sidebar_menu_item_id);

    // Get all menu items
    const menus = await db
      .collection("sidebar_menu_items")
      .find({ _id: { $in: menuIds } })
      .toArray();

    // Find Order Management parent
    const orderMgmt = menus.find((m) => m.label === "Order Management");

    // Find all submenus under Order Management
    const submenus = menus
      .filter((m) => m.parent_id && m.parent_id.equals(orderMgmt._id))
      .sort((a, b) => a.m_order - b.m_order);

    console.log("\nOrder Management Submenus (current order):");
    submenus.forEach((s) => {
      console.log(`  ${s.m_order}: ${s.label} (ID: ${s._id})`);
    });

    // Find Approve Orders and Approved Orders
    const approveOrders = submenus.find((s) => s.label === "Approve Orders");
    const approvedOrders = submenus.find((s) => s.label === "Approved Orders");

    console.log("\n📍 Target items:");
    console.log(`  Approve Orders: m_order=${approveOrders?.m_order}, ID=${approveOrders?._id}`);
    console.log(`  Approved Orders: m_order=${approvedOrders?.m_order}, ID=${approvedOrders?._id}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkMenuOrder();
