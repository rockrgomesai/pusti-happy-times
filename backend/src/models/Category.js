/**
 * Category Model
 * Defines hierarchical product categories with segment inheritance helpers.
 */

const mongoose = require("mongoose");

const PRODUCT_SEGMENTS = ["BEV", "BIS"];

const normalizeProductSegment = (value) => {
  if (!value) return value;
  const upper = String(value).trim().toUpperCase();
  if (upper.startsWith("BIS")) return "BIS";
  if (upper.startsWith("BEV")) return "BEV";
  return upper;
};

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    product_segment: {
      type: String,
      enum: PRODUCT_SEGMENTS,
      required: true,
      index: true,
      set: normalizeProductSegment,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    created_by: {
      type: String,
      required: true,
      trim: true,
    },
    updated_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    updated_by: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: "categories",
    versionKey: false,
  }
);

categorySchema.index({ name: 1 }, { unique: true, name: "idx_category_name_unique" });
categorySchema.index({ parent_id: 1 }, { name: "idx_category_parent_id", sparse: true });
categorySchema.index({ product_segment: 1 }, { name: "idx_category_product_segment" });
categorySchema.index({ active: 1 }, { name: "idx_category_active" });
categorySchema.index(
  { product_segment: 1, active: 1 },
  { name: "idx_category_segment_active" }
);
categorySchema.index({ created_at: -1 }, { name: "idx_category_created_at_desc" });

categorySchema.statics.PRODUCT_SEGMENTS = PRODUCT_SEGMENTS;
categorySchema.statics.normalizeProductSegment = normalizeProductSegment;

categorySchema.methods.isRoot = function () {
  return !this.parent_id;
};

categorySchema.statics.updateDescendantsSegment = async function (rootId, newSegment, actor) {
  const queue = [rootId];
  const updatedBy = actor || "system";

  while (queue.length) {
    const currentId = queue.shift();
    const children = await this.find({ parent_id: currentId }).select("_id");
    if (!children.length) continue;

    const childIds = children.map((child) => child._id);
    const now = new Date();

    await this.updateMany(
      { _id: { $in: childIds } },
      {
        $set: {
          product_segment: newSegment,
          updated_at: now,
          updated_by: updatedBy,
        },
      }
    );

    queue.push(...childIds);
  }
};

categorySchema.pre("save", function (next) {
  this.product_segment = normalizeProductSegment(this.product_segment);
  this.updated_at = new Date();
  if (!this.created_at) {
    this.created_at = new Date();
  }
  next();
});

categorySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const set = update.$set || {};

  if (set.product_segment) {
    set.product_segment = normalizeProductSegment(set.product_segment);
  }

  set.updated_at = new Date();
  update.$set = set;
  this.setUpdate(update);
  next();
});

module.exports = mongoose.model("Category", categorySchema);