/**
 * Setup: Time Pass Register Module
 * Creates API permissions, sidebar menu item, and assigns all to SuperAdmin.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   cd backend && node scripts/setup-time-pass-register.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
    return mongoose.connection.db;
};

const setup = async () => {
    console.log("\n🚀 Setting up Time Pass Register module...\n" + "=".repeat(60));

    const db = await connectDB();

    // ── 1. API Permissions ────────────────────────────────────────────────────
    console.log("\n📋 Creating API permissions...");
    const apiPermsCol = db.collection("api_permissions");

    const permissions = [
        "time-pass-register:read",
        "time-pass-register:create",
        "time-pass-register:update",
        "time-pass-register:current",
    ];

    const permIds = {};
    for (const perm of permissions) {
        const existing = await apiPermsCol.findOne({ api_permissions: perm });
        if (existing) {
            console.log(`  ⚠️  Already exists: ${perm}`);
            permIds[perm] = existing._id;
        } else {
            const { insertedId } = await apiPermsCol.insertOne({ api_permissions: perm });
            permIds[perm] = insertedId;
            console.log(`  ✅ Created: ${perm}`);
        }
    }

    // ── 2. Find SuperAdmin role ───────────────────────────────────────────────
    const rolesCol = db.collection("roles");
    const superAdminRole = await rolesCol.findOne({ role: "SuperAdmin" });
    if (!superAdminRole) {
        console.error("  ❌ SuperAdmin role not found");
        process.exit(1);
    }
    console.log(`\n👑 SuperAdmin role ID: ${superAdminRole._id}`);

    // ── 3. Assign API permissions to SuperAdmin ───────────────────────────────
    console.log("\n🔐 Assigning permissions to SuperAdmin...");
    const roleApiPermsCol = db.collection("role_api_permissions");

    for (const perm of permissions) {
        const permId = permIds[perm];
        const existing = await roleApiPermsCol.findOne({
            role_id: superAdminRole._id,
            api_permission_id: permId,
        });
        if (existing) {
            console.log(`  ⚠️  Already assigned: ${perm}`);
        } else {
            await roleApiPermsCol.insertOne({
                role_id: superAdminRole._id,
                api_permission_id: permId,
            });
            console.log(`  ✅ Assigned: ${perm}`);
        }
    }

    // ── 4. Find audit user ───────────────────────────────────────────────────
    const usersCol = db.collection("users");
    const adminUser =
        (await usersCol.findOne({ username: "superadmin" })) ||
        (await usersCol.findOne({}, { sort: { _id: 1 } }));
    if (!adminUser) {
        console.error("  ❌ No users found");
        process.exit(1);
    }
    const adminUserId = adminUser._id;
    console.log(`\n👤 Audit user: "${adminUser.username}"`);

    // ── 5. Find "Master Data" parent menu item ───────────────────────────────
    const menuCol = db.collection("sidebar_menu_items");

    // Try to find an existing "Master" or "Master Data" parent group
    const masterParent = await menuCol.findOne({
        $or: [
            { title: { $regex: /^master/i }, parent_id: null },
            { label: { $regex: /^master/i }, parent_id: null },
        ],
    });

    const parentId = masterParent ? masterParent._id : null;
    if (masterParent) {
        console.log(`\n📂 Found Master parent menu: "${masterParent.title || masterParent.label}" (${masterParent._id})`);
    } else {
        console.log("\n📂 No Master parent found — menu item will be created at root level");
    }

    // ── 6. Sidebar menu item ──────────────────────────────────────────────────
    console.log("\n🎯 Creating sidebar menu item...");
    const menuPath = "/master/time-pass-register";
    const existing = await menuCol.findOne({ path: menuPath });

    let menuItemId;
    if (existing) {
        console.log("  ⚠️  Menu item already exists");
        menuItemId = existing._id;
    } else {
        const { insertedId } = await menuCol.insertOne({
            label: "Time Pass Register",
            href: menuPath,
            m_order: 95,
            icon: "CalendarMonth",
            parent_id: parentId,
            is_submenu: !!parentId,
        });
        menuItemId = insertedId;
        console.log(`  ✅ Created menu item: Time Pass Register (${insertedId})`);
    }

    // ── 7. Assign menu item to SuperAdmin role ────────────────────────────────
    console.log("\n📌 Assigning menu item to SuperAdmin role...");
    const roleMenuCol = db.collection("role_sidebar_menu_items");
    const menuAssignExists = await roleMenuCol.findOne({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: menuItemId,
    });
    if (menuAssignExists) {
        console.log("  ⚠️  Menu assignment already exists");
    } else {
        await roleMenuCol.insertOne({
            role_id: superAdminRole._id,
            sidebar_menu_item_id: menuItemId,
            m_order: null,
        });
        console.log("  ✅ Menu item assigned to SuperAdmin");
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("✅ Time Pass Register setup complete!\n");
    console.log("📝 Summary:");
    console.log("   - 4 API permissions created and assigned to SuperAdmin");
    console.log('   - Sidebar menu item "/master/time-pass-register" created');
    console.log("   - Menu item assigned to SuperAdmin role");
    console.log("\n🔧 Access:");
    console.log("   Frontend: /master/time-pass-register");
    console.log("   API:      GET/POST/PUT /api/v1/master/time-pass-register");
    console.log("   Widget:   GET /api/v1/master/time-pass-register/current\n");

    await mongoose.disconnect();
};

setup().catch((err) => {
    console.error("❌ Setup failed:", err);
    process.exit(1);
});
