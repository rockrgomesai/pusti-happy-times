/**
 * Distributor Model
 * Strictly adheres to the client-specified contract.
 */

const mongoose = require("mongoose");

const { Schema } = mongoose;

const PRODUCT_SEGMENTS = ["BIS", "BEV"];
const DISTRIBUTOR_TYPES = [
  "Commission Distributor",
  "General Distributor",
  "Special Distributor",
  "Spot Distributor",
  "Super Distributor",
];
const BINARY_CHOICES = ["Yes", "No"];
const ORDER_UNITS = ["CTN", "PCS"];

const toDecimal = (value) => {
  if (value == null) {
    return mongoose.Types.Decimal128.fromString("0.00");
  }
  if (value instanceof mongoose.Types.Decimal128) {
    return value;
  }
  if (typeof value === "number") {
    return mongoose.Types.Decimal128.fromString(value.toFixed(2));
  }
  const numeric = String(value).trim();
  if (!numeric.length) {
    return mongoose.Types.Decimal128.fromString("0.00");
  }
  return mongoose.Types.Decimal128.fromString(numeric);
};

const normalizePhone = (value) => {
  if (!value) {
    return null;
  }
  const raw = String(value).replace(/[^\d+]/g, "");
  if (!raw.length) {
    return null;
  }
  if (raw.startsWith("+")) {
    return raw;
  }
  return `+${raw}`;
};

const distributorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 160,
      index: true,
    },
    db_point_id: {
      type: Schema.Types.ObjectId,
      ref: "Territory",
      required: true,
      index: true,
    },
    product_segment: {
      type: [
        {
          type: String,
          enum: PRODUCT_SEGMENTS,
          required: true,
        },
      ],
      required: true,
      validate: {
        validator: (segments) => Array.isArray(segments) && segments.length > 0,
        message: "At least one product segment is required",
      },
    },
    territorries: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    skus_exclude: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
      ],
      default: [],
      validate: {
        validator: async function (skuIds) {
          if (!skuIds || skuIds.length === 0) {
            return true;
          }

          const uniqueIds = [...new Set(skuIds.map((id) => id.toString()))];
          if (uniqueIds.length !== skuIds.length) {
            return false;
          }

          const Product = mongoose.model("Product");
          const products = await Product.find({ _id: { $in: skuIds } })
            .select(["_id"])
            .lean();

          if (products.length !== skuIds.length) {
            return false;
          }

          return true;
        },
        message: "One or more excluded SKUs are invalid.",
      },
    },
    distributor_type: {
      type: String,
      enum: DISTRIBUTOR_TYPES,
      required: true,
    },
    erp_id: {
      type: Number,
      unique: true,
      sparse: true,
    },
    mobile: {
      type: String,
      trim: true,
      set: normalizePhone,
      validate: {
        validator: (value) => !value || /^\+\d{8,15}$/.test(value),
        message: "Mobile number must follow E.164 format",
      },
      sparse: true,
      index: true,
    },
    credit_limit: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0.00"),
      set: toDecimal,
    },
    bank_guarantee: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0.00"),
      set: toDecimal,
    },
    delivery_depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      default: null,
    },
    proprietor: {
      type: String,
      default: null,
      trim: true,
    },
    proprietor_dob: {
      type: Date,
      default: null,
    },
    registration_date: {
      type: Date,
      default: null,
    },
    computer: {
      type: String,
      enum: BINARY_CHOICES,
      default: "No",
    },
    printer: {
      type: String,
      enum: BINARY_CHOICES,
      default: "No",
    },
    emergency_contact: {
      type: String,
      default: null,
      trim: true,
    },
    emergency_relation: {
      type: String,
      default: null,
      trim: true,
    },
    emergency_mobile: {
      type: String,
      default: null,
      trim: true,
      set: normalizePhone,
      validate: {
        validator: (value) => !value || /^\+\d{8,15}$/.test(value),
        message: "Emergency mobile must follow E.164 format",
      },
    },
    unit: {
      type: String,
      enum: ORDER_UNITS,
      required: true,
    },
    latitude: {
      type: String,
      default: null,
      trim: true,
    },
    longitude: {
      type: String,
      default: null,
      trim: true,
    },
    address: {
      type: String,
      default: null,
      trim: true,
    },
    note: {
      type: String,
      default: null,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    collection: "distributors",
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  }
);

distributorSchema.index({ name: 1 }, { unique: true });
distributorSchema.index({ db_point_id: 1 });
distributorSchema.index({ active: 1 });

distributorSchema.pre("validate", async function preValidate(next) {
  try {
    if (!this.db_point_id) {
      return next(new Error("DB Point is required"));
    }

    const Territory = mongoose.model("Territory");
    const dbPoint = await Territory.findById(this.db_point_id)
      .select(["type", "ancestors", "name", "level"])
      .lean();

    if (!dbPoint) {
      return next(new Error("Selected DB Point not found"));
    }

    if (dbPoint.type !== "db_point") {
      return next(new Error("Selected territory must be a DB Point"));
    }

    const ancestorIds = [...(dbPoint.ancestors || []), this.db_point_id];
    const territorySnapshots = await Territory.find({ _id: { $in: ancestorIds } })
      .select(["name", "type", "level"])
      .lean();

    const orderedSnapshots = ancestorIds.map((id) => {
      const snapshot = territorySnapshots.find(
        (territory) => territory._id.toString() === id.toString()
      );
      if (!snapshot) {
        return { _id: id };
      }
      return {
        _id: snapshot._id,
        name: snapshot.name,
        type: snapshot.type,
        level: snapshot.level,
      };
    });

    this.territorries = orderedSnapshots;

    if (Array.isArray(this.product_segment)) {
      this.product_segment = [...new Set(this.product_segment.map((value) => value))];
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

distributorSchema.pre("save", function preSave(next) {
  if (Array.isArray(this.skus_exclude)) {
    this.skus_exclude = this.skus_exclude.filter(
      (id, index, array) =>
        array.findIndex((candidate) => candidate.toString() === id.toString()) === index
    );
  }
  next();
});

distributorSchema.pre("findOneAndUpdate", async function preFindOneAndUpdate(next) {
  try {
    const update = this.getUpdate() || {};
    const modifications = update.$set ? update.$set : update;

    if (modifications.skus_exclude) {
      const normalized = Array.isArray(modifications.skus_exclude)
        ? modifications.skus_exclude
        : [modifications.skus_exclude];
      const deduped = normalized.filter(
        (candidate, index, source) =>
          source.findIndex((entry) => entry.toString() === candidate.toString()) === index
      );
      modifications.skus_exclude = deduped;
    }

    if (modifications.product_segment) {
      modifications.product_segment = [...new Set(modifications.product_segment)];
    }

    const dbPointId = modifications.db_point_id || (update.$set && update.$set.db_point_id);

    if (dbPointId) {
      const Territory = mongoose.model("Territory");
      const dbPoint = await Territory.findById(dbPointId)
        .select(["type", "ancestors", "name", "level"])
        .lean();

      if (!dbPoint) {
        return next(new Error("Selected DB Point not found"));
      }

      if (dbPoint.type !== "db_point") {
        return next(new Error("Selected territory must be a DB Point"));
      }

      const ancestorIds = [...(dbPoint.ancestors || []), dbPointId];
      const snapshots = await Territory.find({ _id: { $in: ancestorIds } })
        .select(["name", "type", "level"])
        .lean();

      const orderedSnapshots = ancestorIds.map((id) => {
        const snapshot = snapshots.find((territory) => territory._id.toString() === id.toString());
        if (!snapshot) {
          return { _id: id };
        }
        return {
          _id: snapshot._id,
          name: snapshot.name,
          type: snapshot.type,
          level: snapshot.level,
        };
      });

      if (update.$set) {
        update.$set.territorries = orderedSnapshots;
      } else {
        update.territorries = orderedSnapshots;
      }
    }

    if (update.$set) {
      this.setUpdate({
        ...update,
        $set: {
          ...update.$set,
        },
      });
    } else {
      this.setUpdate({ ...update });
    }

    next();
  } catch (error) {
    next(error);
  }
});

if (!mongoose.models.Distributor) {
  distributorSchema.set("toJSON", {
    transform: (doc, ret) => {
      if (ret.credit_limit instanceof mongoose.Types.Decimal128) {
        ret.credit_limit = ret.credit_limit.toString();
      }
      if (ret.bank_guarantee instanceof mongoose.Types.Decimal128) {
        ret.bank_guarantee = ret.bank_guarantee.toString();
      }
      return ret;
    },
  });
}

module.exports = mongoose.models.Distributor || mongoose.model("Distributor", distributorSchema);
