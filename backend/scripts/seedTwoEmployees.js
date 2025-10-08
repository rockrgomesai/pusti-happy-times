/**
 * Quick seed script to create the employees collection with two example documents.
 *
 * Usage:
 *   node scripts/seedTwoEmployees.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { Employee, Designation, User } = require("../src/models");

const employees = [
  {
    employee_id: "EMP-1001",
    designationName: "Senior Sales Executive",
    name: "Mariam Akter",
    father_name: "Shafiqul Islam",
    mother_name: "Nazma Begum",
    date_birth: "1992-08-18",
    gender: "female",
    religion: "Islam",
  marital_status: "married",
    nationality: "Bangladeshi",
    national_id: "1992081800123",
    mobile_personal: "01711000010",
    email: "mariam.akter@example.com",
  },
  {
    employee_id: "EMP-1002",
    designationName: "Warehouse Supervisor",
    name: "Rashedul Karim",
    father_name: "Habibur Rahman",
    mother_name: "Tasnim Jahan",
    date_birth: "1989-03-04",
    gender: "male",
    religion: "Islam",
  marital_status: "married",
    nationality: "Bangladeshi",
    national_id: "1989030400456",
    mobile_personal: "01712000020",
    email: "rashedul.karim@example.com",
  },
];

const getEnv = (key, fallback) => process.env[key] || fallback;

const connectDatabase = async () => {
  const uri =
    getEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/pusti_happy_times");

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("✅ Connected to MongoDB");
};

const pickAuditUser = async () => {
  const user = await User.findOne({}).select("_id username");
  if (!user) {
    throw new Error(
      "No users found. Please create at least one user before seeding employees."
    );
  }

  console.log(`📝 Using audit user: ${user.username}`);
  return user._id;
};

const resolveDesignationId = async (designationName) => {
  const designation = await Designation.findOne({ name: designationName });
  if (!designation) {
    throw new Error(
      `Designation '${designationName}' not found. Seed designations before running this script.`
    );
  }
  return designation._id;
};

const toNullable = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
};

const buildEmployeeDocument = async (seedData, auditUserId) => {
  const designation_id = await resolveDesignationId(seedData.designationName);

  return {
    employee_id: seedData.employee_id,
    designation_id,
    name: seedData.name,
    father_name: toNullable(seedData.father_name),
    mother_name: toNullable(seedData.mother_name),
    date_birth: new Date(seedData.date_birth),
    gender: seedData.gender,
    religion: seedData.religion,
    marital_status: seedData.marital_status,
    nationality: toNullable(seedData.nationality) || "Bangladeshi",
    national_id: toNullable(seedData.national_id),
    passport_number: toNullable(seedData.passport_number),
    passport_issue_date: seedData.passport_issue_date
      ? new Date(seedData.passport_issue_date)
      : null,
    mobile_personal: toNullable(seedData.mobile_personal),
    email: toNullable(seedData.email),
    emergency_contact: toNullable(seedData.emergency_contact),
    emergency_mobile: toNullable(seedData.emergency_mobile),
    blood_group: toNullable(seedData.blood_group),
    present_address: {
      holding_no: toNullable(seedData.present_address?.holding_no),
      road: toNullable(seedData.present_address?.road),
      city: toNullable(seedData.present_address?.city),
      post_code:
        seedData.present_address?.post_code === undefined ||
        seedData.present_address?.post_code === null
          ? null
          : Number(seedData.present_address.post_code),
    },
    permanent_address: {
      holding_no: toNullable(seedData.permanent_address?.holding_no),
      village_road: toNullable(seedData.permanent_address?.village_road),
      union_ward: toNullable(seedData.permanent_address?.union_ward),
      upazila_thana: toNullable(seedData.permanent_address?.upazila_thana),
      district: toNullable(seedData.permanent_address?.district),
      division: toNullable(seedData.permanent_address?.division),
    },
    ssc_year:
      seedData.ssc_year === undefined || seedData.ssc_year === null
        ? null
        : Number(seedData.ssc_year),
    highest_degree: toNullable(seedData.highest_degree),
    last_organization: toNullable(seedData.last_organization),
    last_position: toNullable(seedData.last_position),
    experience_years:
      seedData.experience_years === undefined || seedData.experience_years === null
        ? 0
        : Number(seedData.experience_years),
    reference_name: toNullable(seedData.reference_name),
    reference_mobile: toNullable(seedData.reference_mobile),
    remarks: toNullable(seedData.remarks),
    active:
      typeof seedData.active === "boolean" ? seedData.active : true,
    created_at: new Date(),
    created_by: auditUserId,
    updated_at: new Date(),
    updated_by: auditUserId,
  };
};

const seedEmployees = async () => {
  const auditUserId = await pickAuditUser();
  const results = [];

  for (const seedData of employees) {
    const existing = await Employee.findOne({
      employee_id: seedData.employee_id,
    }).select("_id");

    if (existing) {
      console.log(`ℹ️  Employee ${seedData.employee_id} already exists (ID: ${existing._id})`);
      results.push({ employee_id: seedData.employee_id, created: false, id: existing._id });
      continue;
    }

    const document = await buildEmployeeDocument(seedData, auditUserId);
    const employee = await Employee.create(document);
    results.push({ employee_id: employee.employee_id, created: true, id: employee._id });
    console.log(`✅ Created employee ${employee.employee_id} (${employee.name})`);
  }

  console.log("\n📈 Summary");
  results.forEach((entry, index) => {
    const status = entry.created ? "created" : "existing";
    console.log(` ${index + 1}. ${entry.employee_id} - ${status} (ID: ${entry.id})`);
  });
};

const main = async () => {
  try {
    await connectDatabase();
    await seedEmployees();
    console.log("\n🎉 Done! Employees collection now has the sample documents.");
  } catch (error) {
    console.error("❌ Failed to seed employees:", error.message || error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 MongoDB connection closed");
    }
  }
};

if (require.main === module) {
  main();
}

module.exports = { seedEmployees: seedEmployees };
