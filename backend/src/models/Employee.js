/**
 * Employee Model
 * Pusti Happy Times - Employee Master Data Schema
 *
 * Mirrors collection structure provided by master data specifications.
 */

const mongoose = require("mongoose");

const GENDERS = Object.freeze(["male", "female"]);
const RELIGIONS = Object.freeze(["Buddism", "Christianity", "Hinduism", "Islam", "Other"]);
const MARITAL_STATUSES = Object.freeze(["single", "married"]);
const BLOOD_GROUPS = Object.freeze(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
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
    district: {
      type: String,
      required: [true, "District is required"],
      enum: {
        values: DISTRICTS,
        message: "{VALUE} is not a valid district",
      },
    },
    division: {
      type: String,
      required: [true, "Division is required"],
      enum: {
        values: DIVISIONS,
        message: "{VALUE} is not a valid division",
      },
    },
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
      required: [true, "Blood group is required"],
      enum: {
        values: BLOOD_GROUPS,
        message: "{VALUE} is not a valid blood group",
      },
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

    // Employee type classification
    employee_type: {
      type: String,
      enum: ["system_admin", "field", "facility", "hq"],
      required: [true, "Employee type is required"],
      index: true,
      default: "system_admin",
    },

    // Territory assignments (for field employees)
    territory_assignments: {
      zone_ids: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Territory" }],
        default: [],
      },
      region_ids: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Territory" }],
        default: [],
      },
      area_ids: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Territory" }],
        default: [],
      },
      db_point_ids: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Territory" }],
        default: [],
      },
      // Flattened list of all territory IDs for efficient querying
      all_territory_ids: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Territory" }],
        default: [],
      },
    },

    // Facility assignment (for facility employees - single facility only)
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      default: null,
      index: true,
    },

    // Factory store assignment (for facility employees with Production role)
    // References a Depot-type facility that serves as the factory's internal store
    factory_store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      default: null,
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

/**
 * Validation middleware - ensure employee_type matches required context fields
 */
employeeSchema.pre("validate", async function (next) {
  // Field employees must have territory assignments
  if (this.employee_type === "field") {
    if (
      !this.territory_assignments ||
      !this.territory_assignments.all_territory_ids ||
      this.territory_assignments.all_territory_ids.length === 0
    ) {
      return next(new Error("Field employees must have territory assignments"));
    }
  }

  // Facility employees must have exactly one facility assignment
  if (this.employee_type === "facility") {
    if (!this.facility_id) {
      return next(new Error("Facility employees must have a facility assignment"));
    }

    // Validate factory_store_id if provided
    if (this.factory_store_id) {
      try {
        const Facility = mongoose.model("Facility");

        // Verify factory_store_id references a Depot-type facility
        const factoryStore = await Facility.findById(this.factory_store_id);
        if (!factoryStore) {
          return next(new Error("factory_store_id references a non-existent facility"));
        }
        if (factoryStore.type !== "Depot") {
          return next(new Error("factory_store_id must reference a Depot-type facility"));
        }

        // Verify facility_id references a Factory-type facility
        const factory = await Facility.findById(this.facility_id);
        if (factory && factory.type !== "Factory") {
          return next(
            new Error("Employees with factory_store_id must be assigned to Factory-type facilities")
          );
        }
      } catch (error) {
        return next(error);
      }
    }
  }

  // System admins should not have context restrictions (warning only, not blocking)
  if (this.employee_type === "system_admin") {
    if (this.territory_assignments?.all_territory_ids?.length > 0 || this.facility_id) {
      console.warn("Warning: System admin should not have context restrictions.");
    }
  }

  next();
});

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
