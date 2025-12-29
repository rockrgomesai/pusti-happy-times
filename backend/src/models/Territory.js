/**
 * Territory Model
 * Supports four-level hierarchy: Zone → Region → Area → DB Point.
 * Stores parent linkage, ancestor chain, and normalized level metadata.
 */

const mongoose = require("mongoose");

const TERRITORY_TYPES = ["zone", "region", "area", "db_point"];

const LEVEL_MAP = {
  zone: 0,
  region: 1,
  area: 2,
  db_point: 3,
};

const territorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Territory name is required"],
      trim: true,
      minlength: [2, "Territory name must be at least 2 characters"],
      maxlength: [160, "Territory name must be at most 160 characters"],
      index: true,
    },
    type: {
      type: String,
      enum: TERRITORY_TYPES,
      required: [true, "Territory type is required"],
      index: true,
    },
    level: {
      type: Number,
      min: 0,
      max: 3,
      required: [true, "Territory level is required"],
      index: true,
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Territory",
      default: null,
      index: true,
    },
    ancestors: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Territory",
        },
      ],
      default: [],
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: [true, "Created at is required"],
    },
    updated_at: {
      type: Date,
      default: Date.now,
      required: [true, "Updated at is required"],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Updated by is required"],
    },
  },
  {
    collection: "territories",
    versionKey: false,
  }
);

territorySchema.statics.TERRITORY_TYPES = TERRITORY_TYPES;
territorySchema.statics.LEVEL_MAP = LEVEL_MAP;

// Indexes for optimal query performance
territorySchema.index({ type: 1, level: 1 });
territorySchema.index({ name: 1, type: 1 }, { unique: true });
territorySchema.index({ parent_id: 1, name: 1 });
territorySchema.index({ ancestors: 1 });
territorySchema.index({ active: 1 });
// Compound index for bulk children queries - optimizes parent_id + type + active queries
territorySchema.index({ parent_id: 1, type: 1, active: 1 });

territorySchema.pre("validate", async function (next) {
  try {
    const doc = this;
    const expectedLevel = LEVEL_MAP[doc.type];

    if (expectedLevel === undefined) {
      return next(new Error("Invalid territory type"));
    }

    doc.level = expectedLevel;

    if (expectedLevel === 0) {
      doc.parent_id = null;
      doc.ancestors = [];
      return next();
    }

    if (!doc.parent_id) {
      return next(new Error("Parent territory is required"));
    }

    if (doc.parent_id && doc._id && doc.parent_id.equals(doc._id)) {
      return next(new Error("A territory cannot be its own parent"));
    }

    const parent = await mongoose
      .model("Territory")
      .findById(doc.parent_id)
      .lean();

    if (!parent) {
      return next(new Error("Parent territory not found"));
    }

    if (parent.level !== expectedLevel - 1) {
      return next(new Error("Invalid hierarchy: parent level mismatch"));
    }

    const docIdString = doc._id?.toString();
    const wouldIntroduceCycle = Array.isArray(parent.ancestors)
      ? parent.ancestors.some((ancestorId) => {
          if (!ancestorId || !docIdString) {
            return false;
          }
          const ancestorString =
            typeof ancestorId === "string" ? ancestorId : ancestorId.toString();
          return ancestorString === docIdString;
        })
      : false;

    if (wouldIntroduceCycle) {
      return next(new Error("Invalid hierarchy: parent is a descendant"));
    }

    if (doc.isNew || doc.isModified("parent_id")) {
      doc.ancestors = [...(parent.ancestors || []), parent._id];
    } else if (!Array.isArray(doc.ancestors) || !doc.ancestors.length) {
      doc.ancestors = [...(parent.ancestors || []), parent._id];
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

territorySchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

territorySchema.pre("findOneAndUpdate", function (next) {
  this.set({ updated_at: new Date() });
  next();
});

module.exports = mongoose.model("Territory", territorySchema);
