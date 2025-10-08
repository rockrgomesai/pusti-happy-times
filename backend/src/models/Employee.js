/**
 * Employee Model
 * Pusti Happy Times - Employee Master Data Schema
 *
 * Mirrors collection structure provided by master data specifications.
 */

const mongoose = require("mongoose");

const GENDERS = Object.freeze(["male", "female"]);
const RELIGIONS = Object.freeze([
  "Buddism",
  "Christianity",
  "Hinduism",
  "Islam",
  "Other",
]);
const MARITAL_STATUSES = Object.freeze(["single", "married"]);
const BLOOD_GROUPS = Object.freeze([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
]);
const DIVISIONS = Object.freeze([
  "Dhaka",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Rangpur",
  "Barishal",
  "Sylhet",
  "Mymensingh",
]);
const DISTRICTS = Object.freeze([
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
  "Narail",
]);

const addressSubSchema = new mongoose.Schema(
  {
    holding_no: { type: String, default: null, trim: true },
    road: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    post_code: { type: Number, default: null },
  },
  { _id: false, id: false }
);

const permanentAddressSubSchema = new mongoose.Schema(
  {
    holding_no: { type: String, default: null, trim: true },
    village_road: { type: String, default: null, trim: true },
    union_ward: { type: String, default: null, trim: true },
    upazila_thana: { type: String, default: null, trim: true },
    district: { type: String, enum: DISTRICTS, default: null },
    division: { type: String, enum: DIVISIONS, default: null },
  },
  { _id: false, id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    employee_id: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    designation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: [true, "Designation is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
      index: true,
    },
    father_name: {
      type: String,
      default: null,
      trim: true,
    },
    mother_name: {
      type: String,
      default: null,
      trim: true,
    },
    date_birth: {
      type: Date,
      required: [true, "Date of birth is required"],
      index: true,
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: GENDERS,
    },
    religion: {
      type: String,
      required: [true, "Religion is required"],
      enum: RELIGIONS,
    },
    marital_status: {
      type: String,
      required: [true, "Marital status is required"],
      enum: MARITAL_STATUSES,
    },
    nationality: {
      type: String,
      default: "Bangladeshi",
      trim: true,
      index: true,
    },
    national_id: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    passport_number: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    passport_issue_date: {
      type: Date,
      default: null,
    },
    mobile_personal: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    emergency_contact: {
      type: String,
      default: null,
      trim: true,
    },
    emergency_mobile: {
      type: String,
      default: null,
      trim: true,
    },
    blood_group: {
      type: String,
      enum: BLOOD_GROUPS,
      default: null,
    },
    present_address: {
      type: addressSubSchema,
      default: () => ({}),
    },
    permanent_address: {
      type: permanentAddressSubSchema,
      default: () => ({}),
    },
    ssc_year: {
      type: Number,
      default: null,
    },
    highest_degree: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    last_organization: {
      type: String,
      default: null,
      trim: true,
    },
    last_position: {
      type: String,
      default: null,
      trim: true,
    },
    experience_years: {
      type: Number,
      default: 0,
      min: 0,
    },
    reference_name: {
      type: String,
      default: null,
      trim: true,
    },
    reference_mobile: {
      type: String,
      default: null,
      trim: true,
    },
    remarks: {
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_at: {
      type: Date,
      required: [true, "Created at is required"],
      default: Date.now,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Created by is required"],
      ref: "User",
    },
    updated_at: {
      type: Date,
      required: [true, "Updated at is required"],
      default: Date.now,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Updated by is required"],
      ref: "User",
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "employees",
  }
);

employeeSchema.pre("save", function (next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

employeeSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updated_at: new Date() });
  next();
});

employeeSchema.statics.findByEmployeeId = async function (employeeId) {
  try {
    return await this.findOne({ employee_id: employeeId });
  } catch (error) {
    throw new Error(`Error finding employee: ${error.message}`);
  }
};

employeeSchema.statics.getActiveEmployees = async function () {
  try {
    return await this.find({ active: true }).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching employees: ${error.message}`);
  }
};

module.exports = mongoose.model("Employee", employeeSchema);