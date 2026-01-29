/**
 * Outlet Model
 * Manages retail outlet/POS information for secondary sales
 */

const mongoose = require("mongoose");

const outletSchema = new mongoose.Schema(
  {
    // Unique identifier
    outlet_id: {
      type: String,
      required: [true, "Outlet ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // Basic information
    outlet_name: {
      type: String,
      required: [true, "Outlet name is required"],
      trim: true,
      index: true,
    },
    outlet_name_bangla: {
      type: String,
      trim: true,
    },

    // Foreign references
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: [true, "Route is required"],
      index: true,
    },
    outlet_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutletType",
      required: [true, "Outlet type is required"],
      index: true,
    },
    outlet_channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutletChannel",
      required: [true, "Outlet channel is required"],
      index: true,
    },

    // Address
    address: {
      type: String,
      trim: true,
    },
    address_bangla: {
      type: String,
      trim: true,
    },

    // GPS Location (GeoJSON format for proximity search)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // Legacy GPS fields (for compatibility with old outlet_info table)
    lati: {
      type: Number,
      default: 0,
    },
    longi: {
      type: Number,
      default: 0,
    },

    // Owner/Contact details
    contact_person: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow empty
          // Bangladeshi mobile format: 01XXXXXXXXX or +8801XXXXXXXXX
          return /^(\+88)?01[3-9]\d{8}$/.test(v);
        },
        message: "Invalid mobile number format",
      },
    },

    // Business metrics
    market_size: {
      type: Number,
      default: 0,
    },
    avg_sales: {
      type: Number,
      default: 0,
    },
    credit_sales: {
      type: Number,
      default: 0,
    },
    polyfab_sales: {
      type: Number,
      default: 0,
    },

    // Shop details
    shop_sign: {
      type: Number,
      default: 0,
      enum: [0, 1], // 0 = No, 1 = Yes
    },
    shop_sign_amount: {
      type: Number,
      default: 0,
    },
    shop_type: {
      type: Number,
      default: 0,
    },
    sales_group: {
      type: String,
      trim: true,
    },

    // Credit management
    credit_limit: {
      type: Number,
      default: 0,
      min: [0, "Credit limit cannot be negative"],
    },
    current_credit_balance: {
      type: Number,
      default: 0,
    },

    // Classification fields from outlet_info
    b_f_both: {
      type: Number,
      default: 0,
    },
    food_outlet: {
      type: Number,
      default: 0,
    },
    key_outlet: {
      type: Number,
      default: 0,
      enum: [0, 1],
    },

    // Mobile app specific fields
    verification_status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    verified_at: {
      type: Date,
    },
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    shop_photo_url: {
      type: String,
    },
    last_visit_date: {
      type: Date,
    },
    visit_frequency: {
      type: Number,
      default: 7, // Days between visits
    },

    // Status and comments
    status: {
      type: Number,
      default: 1,
    },
    comments: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Sync metadata for mobile app
    sync_version: {
      type: Number,
      default: 1,
    },
    last_synced_at: {
      type: Date,
    },

    // Audit fields
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    created_date: {
      type: Date,
      default: Date.now,
    },
    update_date_time: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "outlets",
    timestamps: false, // Using custom created_date and update_date_time
    versionKey: false,
  }
);

// Indexes
outletSchema.index({ outlet_id: 1 }, { unique: true });
outletSchema.index({ route_id: 1, active: 1 });
outletSchema.index({ outlet_type: 1 });
outletSchema.index({ outlet_channel_id: 1 });
outletSchema.index({ mobile: 1 });
outletSchema.index({ verification_status: 1 });
outletSchema.index({ location: "2dsphere" }); // Geospatial index for proximity search

// Compound indexes
outletSchema.index({ route_id: 1, active: 1, verification_status: 1 });

// Pre-save middleware to update timestamps and sync location fields
outletSchema.pre("save", function (next) {
  this.update_date_time = new Date();

  // Sync location GeoJSON with legacy lat/lon fields
  if (this.isModified("lati") || this.isModified("longi")) {
    if (this.longi !== 0 || this.lati !== 0) {
      this.location = {
        type: "Point",
        coordinates: [this.longi, this.lati],
      };
    }
  }

  // Sync legacy fields if GeoJSON is modified
  if (this.isModified("location.coordinates")) {
    this.longi = this.location.coordinates[0];
    this.lati = this.location.coordinates[1];
  }

  next();
});

// Virtual for display name
outletSchema.virtual("display_name").get(function () {
  return `${this.outlet_name} (${this.outlet_id})`;
});

// Static method: Generate next outlet ID for a route
outletSchema.statics.generateOutletId = async function (routeId) {
  const prefix = `OUT-${routeId}-`;
  const lastOutlet = await this.findOne({
    outlet_id: { $regex: `^${prefix}` },
  })
    .sort({ outlet_id: -1 })
    .select("outlet_id");

  if (!lastOutlet) {
    return `${prefix}001`;
  }

  const lastNumber = parseInt(lastOutlet.outlet_id.split("-").pop()) || 0;
  const nextNumber = (lastNumber + 1).toString().padStart(3, "0");
  return `${prefix}${nextNumber}`;
};

// Static method: Find nearby outlets (geospatial query)
outletSchema.statics.findNearby = function (longitude, latitude, maxDistanceKm = 5) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceKm * 1000, // Convert km to meters
      },
    },
    active: true,
  }).limit(50);
};

// Instance method: Update last visit
outletSchema.methods.updateLastVisit = function () {
  this.last_visit_date = new Date();
  return this.save();
};

// Instance method: Check credit availability
outletSchema.methods.hasCreditAvailable = function (requestedAmount) {
  const available = this.credit_limit - this.current_credit_balance;
  return available >= requestedAmount;
};

// Ensure virtuals are included in JSON
outletSchema.set("toJSON", { virtuals: true });
outletSchema.set("toObject", { virtuals: true });

const Outlet = mongoose.model("Outlet", outletSchema);

module.exports = Outlet;
