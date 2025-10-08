/**
 * Seed Employees Collection
 * Pusti Happy Times - Initial Employee Data Setup
 *
 * Usage: node seed-employees.js
 */

require("dotenv").config({ path: `${__dirname}/.env` });
const mongoose = require("mongoose");
const Employee = require("./src/models/Employee");
const { User, Designation } = require("./src/models");

const employeesToEnsure = [
  {
    employee_id: "EMP-0001",
    designationName: "Sales Admin",
    name: "Ayesha Rahman",
    father_name: "Abdul Rahman",
    mother_name: "Salma Rahman",
    date_birth: "1990-05-12",
    gender: "female",
    religion: "Islam",
  marital_status: "married",
    nationality: "Bangladeshi",
    national_id: "1990123456789",
    mobile_personal: "01700000001",
    email: "ayesha.rahman@example.com",
    emergency_contact: "Mahmud Rahman",
    emergency_mobile: "01710000001",
    blood_group: "A+",
    present_address: {
      holding_no: "22/B",
      road: "Green Road",
      city: "Dhaka",
      post_code: 1205,
    },
    permanent_address: {
      holding_no: "45",
      village_road: "Uttar Badda",
      union_ward: "Ward 19",
      upazila_thana: "Badda",
      district: "Dhaka",
      division: "Dhaka",
    },
    ssc_year: 2006,
    highest_degree: "MBA (Marketing)",
    last_organization: "ABC Retail Ltd",
    last_position: "Senior Sales Executive",
    experience_years: 8,
    reference_name: "Rafiq Ahmed",
    reference_mobile: "01720000001",
    remarks: "Key contributor for national sales initiatives.",
  },
  {
    employee_id: "EMP-0002",
    designationName: "HR Manager",
    name: "Nazmul Hasan",
    father_name: "Abu Hasan",
    mother_name: "Shamsun Nahar",
    date_birth: "1987-09-22",
    gender: "male",
    religion: "Islam",
  marital_status: "married",
    nationality: "Bangladeshi",
    national_id: "1987123456789",
    mobile_personal: "01700000002",
    email: "nazmul.hasan@example.com",
    emergency_contact: "Farhana Hasan",
    emergency_mobile: "01710000002",
    blood_group: "O+",
    present_address: {
      holding_no: "12",
      road: "Lake Drive",
      city: "Dhaka",
      post_code: 1212,
    },
    permanent_address: {
      holding_no: "30",
      village_road: "Joynagar",
      union_ward: "Ward 5",
      upazila_thana: "Sadar",
      district: "Gazipur",
      division: "Dhaka",
    },
    ssc_year: 2003,
    highest_degree: "BBA (HRM)",
    last_organization: "People First Ltd",
    last_position: "HR Executive",
    experience_years: 10,
    reference_name: "Hasina Akter",
    reference_mobile: "01720000002",
    remarks: "Experienced HR leader with training expertise.",
  },
  {
    employee_id: "EMP-0003",
    designationName: "Software Developer",
    name: "Sadia Chowdhury",
    father_name: "Mahbub Chowdhury",
    mother_name: "Rehana Chowdhury",
    date_birth: "1994-01-15",
    gender: "female",
    religion: "Islam",
  marital_status: "single",
    nationality: "Bangladeshi",
    national_id: "1994123456789",
    mobile_personal: "01700000003",
    email: "sadia.chowdhury@example.com",
    emergency_contact: "Mahbub Chowdhury",
    emergency_mobile: "01710000003",
    blood_group: "B+",
    present_address: {
      holding_no: "7",
      road: "Kamal Ataturk Ave",
      city: "Dhaka",
      post_code: 1213,
    },
    permanent_address: {
      holding_no: "17",
      village_road: "Chowdhury Para",
      union_ward: "Ward 8",
      upazila_thana: "Chattogram Sadar",
      district: "Chattogram",
      division: "Chattogram",
    },
    ssc_year: 2010,
    highest_degree: "BSc in CSE",
    last_organization: "Tech Innovators",
    last_position: "Junior Developer",
    experience_years: 4,
    reference_name: "Kamrul Islam",
    reference_mobile: "01720000003",
    remarks: "Full-stack developer specialising in MERN stack.",
  },
];

const connectDatabase = async () => {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("✅ Connected to MongoDB");
};

const resolveAuditUser = async () => {
  const user = await User.findOne({}).select("_id username");

  if (!user) {
    throw new Error(
      "No users found. Please create an administrative user before seeding employees."
    );
  }

  return user;
};

const resolveDesignationId = async (designationName) => {
  const designation = await Designation.findOne({ name: designationName });

  if (!designation) {
    throw new Error(
      `Designation '${designationName}' not found. Seed designations before employees.`
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

const buildEmployeeDocument = async (employeeData, auditUserId) => {
  const designationId = await resolveDesignationId(employeeData.designationName);

  return {
    employee_id: employeeData.employee_id,
    designation_id: designationId,
    name: employeeData.name,
    father_name: toNullable(employeeData.father_name),
    mother_name: toNullable(employeeData.mother_name),
    date_birth: new Date(employeeData.date_birth),
    gender: employeeData.gender,
    religion: employeeData.religion,
    marital_status: employeeData.marital_status,
    nationality: toNullable(employeeData.nationality) || "Bangladeshi",
    national_id: toNullable(employeeData.national_id),
    passport_number: toNullable(employeeData.passport_number),
    passport_issue_date: employeeData.passport_issue_date
      ? new Date(employeeData.passport_issue_date)
      : null,
    mobile_personal: toNullable(employeeData.mobile_personal),
    email: toNullable(employeeData.email),
    emergency_contact: toNullable(employeeData.emergency_contact),
    emergency_mobile: toNullable(employeeData.emergency_mobile),
    blood_group: toNullable(employeeData.blood_group),
    present_address: {
      holding_no: toNullable(employeeData.present_address?.holding_no),
      road: toNullable(employeeData.present_address?.road),
      city: toNullable(employeeData.present_address?.city),
      post_code:
        employeeData.present_address?.post_code === undefined ||
        employeeData.present_address?.post_code === null
          ? null
          : Number(employeeData.present_address.post_code),
    },
    permanent_address: {
      holding_no: toNullable(employeeData.permanent_address?.holding_no),
      village_road: toNullable(employeeData.permanent_address?.village_road),
      union_ward: toNullable(employeeData.permanent_address?.union_ward),
      upazila_thana: toNullable(employeeData.permanent_address?.upazila_thana),
      district: toNullable(employeeData.permanent_address?.district),
      division: toNullable(employeeData.permanent_address?.division),
    },
    ssc_year:
      employeeData.ssc_year === undefined || employeeData.ssc_year === null
        ? null
        : Number(employeeData.ssc_year),
    highest_degree: toNullable(employeeData.highest_degree),
    last_organization: toNullable(employeeData.last_organization),
    last_position: toNullable(employeeData.last_position),
    experience_years:
      employeeData.experience_years === undefined ||
      employeeData.experience_years === null
        ? 0
        : Number(employeeData.experience_years),
    reference_name: toNullable(employeeData.reference_name),
    reference_mobile: toNullable(employeeData.reference_mobile),
    remarks: toNullable(employeeData.remarks),
    active: typeof employeeData.active === "boolean" ? employeeData.active : true,
    created_at: new Date(),
    created_by: auditUserId,
    updated_at: new Date(),
    updated_by: auditUserId,
  };
};

const seedEmployees = async () => {
  console.log("🌱 Ensuring default employees are available...");

  const auditUser = await resolveAuditUser();
  console.log(`📝 Using audit user: ${auditUser.username}`);

  const results = [];

  for (const employeeData of employeesToEnsure) {
    const existing = await Employee.findOne({
      employee_id: employeeData.employee_id,
    });

    if (existing) {
      console.log(`ℹ️  Employee already exists: ${employeeData.employee_id}`);
      results.push({
        employee_id: employeeData.employee_id,
        created: false,
        id: existing._id,
      });
      continue;
    }

    const document = await buildEmployeeDocument(employeeData, auditUser._id);
    const employee = new Employee(document);
    await employee.save();

    results.push({
      employee_id: employee.employee_id,
      created: true,
      id: employee._id,
    });

    console.log(
      `✅ Created employee: ${employee.employee_id} (${employee.name}) (ID: ${employee._id})`
    );
  }

  console.log("\n📈 Summary");
  results.forEach((entry, index) => {
    const status = entry.created ? "created" : "existing";
    console.log(` ${index + 1}. ${entry.employee_id} - ${status} (ID: ${entry.id})`);
  });

  return results;
};

const main = async () => {
  try {
    await connectDatabase();
    await seedEmployees();
    console.log("\n🎉 Employee seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding employees:", error.message || error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    }
  }
};

if (require.main === module) {
  main();
}

module.exports = { seedEmployees, employeesToEnsure };