/**
 * DSR (Distributor Sales Representative) Model
 * Pusti Happy Times - DSR Management Schema
 * 
 * DSRs are field staff working for distributors. They distribute goods from
 * distributor's inventory to retail outlets and handle damaged goods returns.
 * 
 * Relationship: DSR belongs to a Distributor (not an employee of TK Group)
 * User Type: 'distributor' (inherits distributor context)
 */

const mongoose = require("mongoose");

/**
 * DSR Schema Definition
 */
const dsrSchema = new mongoose.Schema(
  {
    // Unique DSR ID (Auto-generated format: DSR-{DISTRIBUTOR_CODE}-{NUMBER})
    dsr_code: {
      type: String,
      required: [true, "DSR code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // DSR Name
    name: {
      type: String,
      required: [true, "DSR name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      index: true,
    },

    // Parent Distributor (REQUIRED - DSR works for this distributor)
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: [true, "Distributor is required"],
      index: true,
    },

    // Contact Information
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      validate: {
        validator: function (value) {
          if (!value) return true; // Optional field
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Please provide a valid email address",
      },
    },

    // Personal Information
    nid_number: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },

    date_of_birth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: null,
    },

    blood_group: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      default: null,
    },

    // Present Address
    present_address: {
      holding_no: {
        type: String,
        default: null,
        trim: true,
      },
      road: {
        type: String,
        default: null,
        trim: true,
      },
      city: {
        type: String,
        default: null,
        trim: true,
      },
      post_code: {
        type: String,
        default: null,
        trim: true,
      },
    },

    // Permanent Address
    permanent_address: {
      village_road: {
        type: String,
        default: null,
        trim: true,
      },
      union_ward: {
        type: String,
        default: null,
        trim: true,
      },
      upazila_thana: {
        type: String,
        default: null,
        trim: true,
      },
      district: {
        type: String,
        default: null,
        trim: true,
      },
      division: {
        type: String,
        default: null,
        trim: true,
      },
    },

    // Employment Information
    joining_date: {
      type: Date,
      required: [true, "Joining date is required"],
      default: Date.now,
    },

    employment_status: {
      type: String,
      enum: ["active", "inactive", "suspended", "terminated"],
      default: "active",
      required: true,
      index: true,
    },

    // Emergency Contact
    emergency_contact_name: {
      type: String,
      default: null,
      trim: true,
    },

    emergency_contact_relation: {
      type: String,
      default: null,
      trim: true,
    },

    emergency_contact_mobile: {
      type: String,
      default: null,
      trim: true,
    },

    // Territory Coverage (areas within distributor's territory)
    assigned_areas: {
      type: [String],
      default: [],
    },

    // User Account Reference
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Profile Picture
    profile_picture_url: {
      type: String,
      default: null,
    },

    // Documents (NID, Photo, Certificates, etc.)
    documents: [
      {
        document_type: {
          type: String,
          enum: ["nid", "photo", "certificate", "other"],
          required: true,
        },
        document_url: {
          type: String,
          required: true,
        },
        uploaded_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Notes/Remarks
    notes: {
      type: String,
      default: null,
      trim: true,
    },

    // Active Status
    active: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },

    // Audit Fields
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updated_at: {
      type: Date,
      required: true,
      default: Date.now,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    collection: "dsrs",
    timestamps: false, // Using manual audit fields
    versionKey: false,
  }
);

/**
 * Indexes for Performance
 */
dsrSchema.index({ dsr_code: 1 }, { unique: true });
dsrSchema.index({ distributor_id: 1, active: 1 });
dsrSchema.index({ distributor_id: 1, employment_status: 1 });
dsrSchema.index({ mobile: 1 });
dsrSchema.index({ name: 1 });

/**
 * Pre-save Middleware
 * Update updated_at timestamp on every save
 */
dsrSchema.pre("save", function (next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

/**
 * Static Methods
 */

/**
 * Get all active DSRs for a distributor
 */
dsrSchema.statics.getActiveByDistributor = async function (distributorId) {
  return this.find({
    distributor_id: distributorId,
    active: true,
    employment_status: "active",
  })
    .populate("distributor_id", "distributor_name distributor_code")
    .populate("user_id", "username email active")
    .sort({ name: 1 });
};

/**
 * Get DSR by code
 */
dsrSchema.statics.getByCode = async function (dsrCode) {
  return this.findOne({ dsr_code: dsrCode })
    .populate("distributor_id", "distributor_name distributor_code db_point_id")
    .populate("user_id", "username email active");
};

/**
 * Generate next DSR code for a distributor
 */
dsrSchema.statics.generateDsrCode = async function (distributorCode) {
  // Find all DSRs for this distributor
  const dsrs = await this.find({}).select("dsr_code").lean();
  
  // Filter DSRs that match the pattern DSR-{distributorCode}-XXX
  const prefix = `DSR-${distributorCode}-`;
  const matchingDsrs = dsrs
    .filter((dsr) => dsr.dsr_code.startsWith(prefix))
    .map((dsr) => {
      const parts = dsr.dsr_code.split("-");
      const num = parseInt(parts[parts.length - 1]);
      return isNaN(num) ? 0 : num;
    });

  const maxNumber = matchingDsrs.length > 0 ? Math.max(...matchingDsrs) : 0;
  const nextNumber = (maxNumber + 1).toString().padStart(3, "0");
  
  return `${prefix}${nextNumber}`;
};

/**
 * Instance Methods
 */

/**
 * Check if DSR can be deleted
 */
dsrSchema.methods.canBeDeleted = function () {
  // Can be deleted if no user account is linked
  return !this.user_id;
};

module.exports = mongoose.model("DSR", dsrSchema);
