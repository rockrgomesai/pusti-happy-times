const mongoose = require("mongoose");
const { Schema } = mongoose;

const MonthlyTargetSchema = new Schema(
    {
        month: {
            type: String,
            required: true,
            match: [/^\d{4}-\d{2}$/, "month must be YYYY-MM"],
        },
        distributor_id: {
            type: Schema.Types.ObjectId,
            ref: "Distributor",
            required: true,
        },
        // null = distributor-only target; ObjectId = SO target
        so_id: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
        product_id: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        target_qty_pcs: {
            type: Number,
            required: true,
            min: 0,
        },
        upload_date: { type: Date },
        upload_user: { type: Schema.Types.ObjectId, ref: "User" },
        last_update_date: { type: Date },
        // Stores the qty value overwritten on the most recent upsert. null on first insert.
        prev_qty_b4_last_upd: { type: Number, default: null },
        active: { type: Boolean, default: true },
        created_by: { type: Schema.Types.ObjectId, ref: "User" },
        updated_by: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Compound unique index.
// so_id: null is treated as a concrete value by MongoDB —
// two distributor-only rows with the same month+distributor+product are rejected.
MonthlyTargetSchema.index(
    { month: 1, distributor_id: 1, so_id: 1, product_id: 1 },
    { unique: true, name: "monthly_target_unique" }
);

module.exports = mongoose.model("MonthlyTarget", MonthlyTargetSchema);
