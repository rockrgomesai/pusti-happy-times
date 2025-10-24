/**
 * Seed Test Employees and Users
 *
 * This script:
 * 1. Clears users and employees collections
 * 2. Preserves designations and roles (client data)
 * 3. Creates test employees and users for each type
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Import models
const User = require("./src/models/User");
const Employee = require("./src/models/Employee");
const Designation = require("./src/models/Designation");
const Role = require("./src/models/Role");
const Distributor = require("./src/models/Distributor");
const Territory = require("./src/models/Territory");
const Facility = require("./src/models/Facility");

// Fruit and color names for test data
const testNames = [
  "Apple",
  "Banana",
  "Cherry",
  "Dragon",
  "Elderberry",
  "Fig",
  "Grape",
  "Honey",
  "Indigo",
  "Jade",
  "Kiwi",
  "Lemon",
  "Mango",
  "Nectar",
  "Orange",
  "Papaya",
  "Quince",
  "Ruby",
];

let nameIndex = 0;
const getNextName = () => testNames[nameIndex++ % testNames.length];

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

async function clearCollections() {
  console.log("\n📦 Clearing users and employees collections...");

  // Delete all users except superadmin
  const deleteResult = await User.deleteMany({ username: { $ne: "superadmin" } });
  console.log(`✅ Deleted ${deleteResult.deletedCount} users (kept superadmin)`);

  // Delete all employees
  const empDeleteResult = await Employee.deleteMany({});
  console.log(`✅ Deleted ${empDeleteResult.deletedCount} employees`);

  console.log("✅ Collections cleared\n");
}

async function createEmployee(
  designation,
  superadminId,
  employeeType,
  facilityId = null,
  territories = null
) {
  const designationName = designation.name;
  const testName = getNextName();
  const fullName = `${designationName} ${testName}`;

  const employeeData = {
    employee_id: `EMP${String(nameIndex).padStart(4, "0")}`,
    designation_id: designation._id,
    employee_type: employeeType,
    name: fullName,
    father_name: `Father of ${testName}`,
    mother_name: `Mother of ${testName}`,
    date_birth: new Date("1990-01-15"),
    gender: "male",
    blood_group: "A+",
    religion: "Islam",
    marital_status: "single",
    nationality: "Bangladeshi",
    mobile_personal: `01700${String(nameIndex).padStart(6, "0")}`,
    email: `${testName.toLowerCase()}.${designationName.toLowerCase().replace(/\s+/g, "")}@test.com`,
    permanent_address: {
      division: "Dhaka",
      district: "Dhaka",
      address: "123 Test Street",
    },
    present_address: {
      division: "Dhaka",
      district: "Dhaka",
      address: "123 Test Street",
    },
    active: true,
    created_by: superadminId,
    updated_by: superadminId,
  };

  // Add facility if provided
  if (facilityId) {
    employeeData.facility_id = facilityId;
  }

  // Add territory assignments if provided
  if (territories) {
    // Flatten all territory IDs into all_territory_ids array
    const allTerritoryIds = [
      ...(territories.zone_ids || []),
      ...(territories.region_ids || []),
      ...(territories.area_ids || []),
      ...(territories.db_point_ids || []),
    ];

    employeeData.territory_assignments = {
      ...territories,
      all_territory_ids: allTerritoryIds,
    };
  }

  const employee = await Employee.create(employeeData);
  console.log(`  ✅ Created employee: ${fullName} (${employeeType})`);

  return employee;
}

async function createUser(employee, role, superadminId, password = "password123") {
  const username = employee.name.toLowerCase().replace(/\s+/g, "");
  const hashedPassword = await bcrypt.hash(password, 10);

  const userData = {
    username,
    email: employee.email,
    password: hashedPassword,
    role_id: role._id,
    user_type: "employee",
    employee_id: employee._id,
    active: true,
    created_by: superadminId,
    updated_by: superadminId,
  };

  const user = await User.create(userData);
  console.log(`  ✅ Created user: ${username} (role: ${role.role})`);

  return user;
}

async function createDistributorUser(
  distributor,
  role,
  testName,
  superadminId,
  password = "password123"
) {
  const username = `dist${testName.toLowerCase()}`;
  const hashedPassword = await bcrypt.hash(password, 10);

  const userData = {
    username,
    email: `${username}@test.com`,
    password: hashedPassword,
    role_id: role._id,
    user_type: "distributor",
    distributor_id: distributor._id,
    active: true,
    created_by: superadminId,
    updated_by: superadminId,
  };

  const user = await User.create(userData);
  const dbPointName = distributor.db_point_name || distributor.name || "Unknown";
  console.log(`  ✅ Created distributor user: ${username} (${dbPointName})`);

  return user;
}

async function seedData() {
  try {
    await connectDB();
    await clearCollections();

    // Get superadmin for created_by
    const superadmin = await User.findOne({ username: "superadmin" });
    if (!superadmin) {
      throw new Error("SuperAdmin user not found!");
    }

    // Get all designations and roles
    const designations = await Designation.find({ active: true }).lean();
    const roles = await Role.find({}).lean();
    const facilities = await Facility.find({ active: true }).lean();
    const territories = await Territory.find({ active: true }).lean();
    const distributors = await Distributor.find({ active: true }).limit(4).lean();

    console.log(`\n📊 Found:`);
    console.log(`  - ${designations.length} designations`);
    console.log(`  - ${roles.length} roles`);
    console.log(`  - ${facilities.length} facilities`);
    console.log(`  - ${territories.length} territories`);
    console.log(`  - ${distributors.length} distributors\n`);

    // Map designation names to employee types (based on your business logic)
    const hqDesignations = [
      "Head of Sales",
      "Finance Manager",
      "Accounts Manager",
      "Distribution Manager",
      "Supply Chain Manager",
      "OM Manager",
      "PS Manager",
      "Sales Admin",
    ];

    const fieldDesignations = ["Zonal Manager", "Regional Manager", "Area Manager"];

    const facilityDesignations = ["Production Manager", "Inventory Manager"];

    // Get zones, regions, areas for territory assignments
    const zones = territories.filter((t) => t.type === "zone");
    const regions = territories.filter((t) => t.type === "region");
    const areas = territories.filter((t) => t.type === "area");

    // Get factories and depots
    const factories = facilities.filter((f) => f.type === "Factory");
    const depots = facilities.filter((f) => f.type === "Depot");

    console.log("🌱 Creating HQ Employees and Users...\n");

    // Map HQ designations to their specific roles
    const hqMapping = {
      "Head of Sales": "HOS",
      "Finance Manager": "Finance",
      "Accounts Manager": "Finance",
      "Distribution Manager": "Distribution",
      "Supply Chain Manager": "SCM",
      "OM Manager": "Order Management",
      "PS Manager": "PSM",
      "Sales Admin": "Sales Admin",
    };

    // Create 1 employee/user for each HQ designation
    for (const desigName of hqDesignations) {
      const designation = designations.find((d) => d.name === desigName);
      const roleName = hqMapping[desigName];
      const role = roles.find((r) => r.role === roleName);

      if (designation && role) {
        const employee = await createEmployee(designation, superadmin._id, "hq");
        await createUser(employee, role, superadmin._id);
      } else {
        console.log(
          `  ⚠️  Skipped ${desigName}: designation=${!!designation}, role=${roleName}=${!!role}`
        );
      }
    }

    console.log("\n🌱 Creating Field Employees and Users...\n");

    // Create 2 employees/users for each field designation
    for (const desigName of fieldDesignations) {
      const designation = designations.find((d) => d.name === desigName);
      if (designation) {
        // Determine role based on designation
        let roleName = "ASM"; // default
        if (desigName.includes("Zonal")) roleName = "ZSM";
        else if (desigName.includes("Regional")) roleName = "RSM";
        else if (desigName.includes("Area")) roleName = "ASM";
        else if (desigName.includes("Sales Officer")) roleName = "SO";

        const fieldRole = roles.find((r) => r.role === roleName);

        if (fieldRole) {
          for (let i = 0; i < 2; i++) {
            // Create territory assignments based on role
            let territoryAssignments = {};

            if (zones.length > 0) {
              const zone = zones[i % zones.length];
              territoryAssignments.zone_ids = [zone._id];

              if (["RSM", "ASM", "SO"].includes(roleName) && regions.length > 0) {
                const region =
                  regions.find((r) => r.parent_id.toString() === zone._id.toString()) ||
                  regions[i % regions.length];
                territoryAssignments.region_ids = [region._id];

                if (["ASM", "SO"].includes(roleName) && areas.length > 0) {
                  const area =
                    areas.find((a) => a.parent_id.toString() === region._id.toString()) ||
                    areas[i % areas.length];
                  territoryAssignments.area_ids = [area._id];
                }
              }
            }

            const employee = await createEmployee(
              designation,
              superadmin._id,
              "field",
              null,
              territoryAssignments
            );
            await createUser(employee, fieldRole, superadmin._id);
          }
        }
      }
    }

    console.log("\n🌱 Creating Facility Employees and Users...\n");

    console.log(`Factories available: ${factories.length}`);
    console.log(`Depots available: ${depots.length}`);

    // Create 2 employees/users for Production Manager (for Factories)
    const productionDesignation = designations.find((d) => d.name === "Production Manager");
    const productionRole = roles.find((r) => r.role === "Production");

    if (productionDesignation && productionRole) {
      if (factories.length > 0) {
        // Use factories if available
        for (let i = 0; i < Math.min(2, factories.length); i++) {
          const facility = factories[i];
          const employee = await createEmployee(
            productionDesignation,
            superadmin._id,
            "facility",
            facility._id
          );
          await createUser(employee, productionRole, superadmin._id);
        }
      } else if (depots.length > 0) {
        // Fallback to depots if no factories
        console.log("⚠️  No factories found, using depots for Production Manager");
        for (let i = 0; i < Math.min(2, depots.length); i++) {
          const facility = depots[i];
          const employee = await createEmployee(
            productionDesignation,
            superadmin._id,
            "facility",
            facility._id
          );
          await createUser(employee, productionRole, superadmin._id);
        }
      } else {
        console.log("⚠️  No facilities found for Production Manager");
      }
    }

    // Create 2 employees/users for Inventory Manager (for Depots)
    const inventoryDesignation = designations.find((d) => d.name === "Inventory Manager");
    const inventoryRole = roles.find((r) => r.role === "Inventory");

    if (inventoryDesignation && inventoryRole) {
      if (depots.length > 0) {
        // Use depots (prefer different ones than Production if possible)
        const startIndex = factories.length > 0 ? 0 : 2; // If factories exist, start from 0, otherwise start from 2
        for (let i = startIndex; i < Math.min(startIndex + 2, depots.length); i++) {
          const facility = depots[i % depots.length];
          const employee = await createEmployee(
            inventoryDesignation,
            superadmin._id,
            "facility",
            facility._id
          );
          await createUser(employee, inventoryRole, superadmin._id);
        }
      } else {
        console.log("⚠️  No depots found for Inventory Manager");
      }
    }

    console.log("\n🌱 Creating Distributor Users...\n");

    // Create 4 distributor users
    const distributorRole = roles.find((r) => r.role === "Distributor");
    if (distributorRole && distributors.length > 0) {
      for (let i = 0; i < Math.min(4, distributors.length); i++) {
        const distributor = distributors[i];
        const testName = getNextName();
        await createDistributorUser(distributor, distributorRole, testName, superadmin._id);
      }
    }

    console.log("\n✅ Seed data creation complete!\n");
    console.log("📋 Summary:");
    const totalUsers = await User.countDocuments();
    const totalEmployees = await Employee.countDocuments();
    console.log(`  - Total users: ${totalUsers}`);
    console.log(`  - Total employees: ${totalEmployees}`);
    console.log("\n💡 All passwords are: password123\n");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the seed
seedData();
