const mongoose = require("mongoose");

// Schema for SR assignment with visit days
const salesRepAssignmentSchema = new mongoose.Schema(
  {
    sr_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    visit_days: {
      type: [String],
      enum: ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"],
      default: [],
    },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    route_id: {
      type: String,
      required: [true, "Route ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    route_name: {
      type: String,
      required: [true, "Route name is required"],
      trim: true,
    },
    area_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Territory",
      required: [true, "Area is required"],
      index: true,
    },
    db_point_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Territory",
      required: [true, "DB Point is required"],
      index: true,
    },
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: [true, "Distributor is required"],
      index: true,
    },
    sr_assignments: {
      sr_1: {
        type: salesRepAssignmentSchema,
        default: () => ({ sr_id: null, visit_days: [] }),
      },
      sr_2: {
        type: salesRepAssignmentSchema,
        default: () => ({ sr_id: null, visit_days: [] }),
      },
    },
    frequency: {
      type: Number,
      default: 0,
      min: [0, "Frequency cannot be negative"],
    },
    contribution: {
      type: Number,
      default: 0,
      min: [0, "Contribution cannot be negative"],
    },
    contribution_mf: {
      type: Number,
      default: 0,
      min: [0, "Contribution MF cannot be negative"],
    },
    route_pf: {
      type: Number,
      default: 0,
      min: [0, "Route PF cannot be negative"],
    },
    outlet_qty: {
      type: Number,
      default: 0,
      min: [0, "Outlet quantity cannot be negative"],
    },
    actual_outlet_qty: {
      type: Number,
      default: 0,
      min: [0, "Actual outlet quantity cannot be negative"],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Compound indexes for efficient queries
routeSchema.index({ distributor_id: 1, active: 1 });
routeSchema.index({ area_id: 1, active: 1 });
routeSchema.index({ db_point_id: 1, active: 1 });
routeSchema.index({ "sr_assignments.sr_1.sr_id": 1 });
routeSchema.index({ "sr_assignments.sr_2.sr_id": 1 });

// Pre-save validation to ensure distributor belongs to the selected DB point
routeSchema.pre("save", async function (next) {
  if (this.isModified("distributor_id") || this.isModified("db_point_id")) {
    const Distributor = mongoose.model("Distributor");
    const distributor = await Distributor.findById(this.distributor_id).select("db_point_id");

    if (!distributor) {
      return next(new Error("Distributor not found"));
    }

    if (distributor.db_point_id.toString() !== this.db_point_id.toString()) {
      return next(new Error("Distributor does not belong to the selected DB Point"));
    }
  }
  next();
});

// Virtual for full route name with area
routeSchema.virtual("full_name").get(function () {
  return `${this.route_id} - ${this.route_name}`;
});

// Ensure virtuals are included in JSON
routeSchema.set("toJSON", { virtuals: true });
routeSchema.set("toObject", { virtuals: true });

const Route = mongoose.model("Route", routeSchema);

module.exports = Route;
