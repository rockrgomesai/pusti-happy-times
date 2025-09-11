const mongoose = require('mongoose');

const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    // name field as requested
    category: { type: String, required: true, trim: true },

    // slug and hierarchy
    slug: { type: String, required: true, lowercase: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    ancestors: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    hasChildren: { type: Boolean, default: false },
    depth: { type: Number, default: 0 },
    fullSlug: { type: String, required: true, lowercase: true, trim: true },

    // misc
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    collection: 'categories', // explicit collection name
  }
);

// indexes
CategorySchema.index({ parent: 1, slug: 1 }, { unique: true });
CategorySchema.index({ ancestors: 1 });
CategorySchema.index({ fullSlug: 1 });
CategorySchema.index({ isActive: 1, hasChildren: 1 });

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// minimal helpers to keep slug/fullSlug consistent
// Compute slug, depth, and fullSlug before validation so required fields are satisfied
CategorySchema.pre('validate', async function (next) {
  try {
    if (!this.slug && this.category) this.slug = slugify(this.category);

    if (this.parent) {
      const parentDoc = await this.constructor
        .findById(this.parent)
        .select('fullSlug depth ancestors')
        .lean();

      if (parentDoc) {
        this.depth = (parentDoc.depth || 0) + 1;
        this.fullSlug = `${parentDoc.fullSlug}/${this.slug}`;
        // compute ancestors = parent's ancestors + parent id
        const parentAnc = Array.isArray(parentDoc.ancestors) ? parentDoc.ancestors : [];
        this.ancestors = [...parentAnc, this.parent];
      } else {
        // If parent was provided but not found, keep defaults; route-level validation should catch this
        this.depth = 0;
        this.fullSlug = this.slug;
        this.ancestors = [];
      }
    } else {
      this.depth = 0;
      this.fullSlug = this.slug;
      this.ancestors = [];
    }
    next();
  } catch (err) {
    next(err);
  }
});

// After save, ensure parent's hasChildren is true when applicable
CategorySchema.post('save', async function (doc, next) {
  try {
    if (doc.parent) {
      await this.constructor.updateOne({ _id: doc.parent }, { $set: { hasChildren: true } }).lean();
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.models.Category || mongoose.model('Category', CategorySchema);