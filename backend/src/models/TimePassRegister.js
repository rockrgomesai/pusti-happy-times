const mongoose = require("mongoose");

const offDaySchema = new mongoose.Schema(
    {
        date: {
            type: String, // "YYYY-MM-DD"
            required: true,
        },
        type: {
            type: String,
            enum: ["weekly_off", "holiday"],
            required: true,
        },
        note: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
        },
    },
    { _id: false }
);

const timePassRegisterSchema = new mongoose.Schema(
    {
        year_month: {
            type: String, // "YYYY-MM"
            required: [true, "Year-month is required"],
            match: [/^\d{4}-\d{2}$/, "year_month must be in YYYY-MM format"],
            unique: true,
        },
        total_days: {
            type: Number,
            required: true,
            min: 28,
            max: 31,
        },
        off_days: {
            type: [offDaySchema],
            default: [],
        },
        working_days: {
            type: Number,
            default: 0,
        },
        holidays_count: {
            type: Number,
            default: 0,
        },
        weekly_offs_count: {
            type: Number,
            default: 0,
        },
        active: {
            type: Boolean,
            default: true,
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
        collection: "time_pass_registers",
    }
);

// Pre-save: recompute derived counts from off_days array
timePassRegisterSchema.pre("save", function (next) {
    this.holidays_count = this.off_days.filter((d) => d.type === "holiday").length;
    this.weekly_offs_count = this.off_days.filter((d) => d.type === "weekly_off").length;
    this.working_days = this.total_days - this.off_days.length;
    next();
});

timePassRegisterSchema.index({ year_month: 1 }, { unique: true });
timePassRegisterSchema.index({ active: 1 });

/**
 * Static: get config for a specific YYYY-MM string.
 * Returns null if not configured — callers fall back to calendar-day calculation.
 */
timePassRegisterSchema.statics.getByMonth = function (yearMonth) {
    return this.findOne({ year_month: yearMonth, active: true }).lean();
};

/**
 * Static: compute Time Pass % for today (or a given date) against a config doc.
 * If config is null, falls back to simple calendar-day ratio.
 */
timePassRegisterSchema.statics.computeTimePassPct = function (config, asOfDate) {
    const today = asOfDate ? new Date(asOfDate) : new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-based
    const dayOfMonth = today.getDate();

    if (!config) {
        // Fallback: calendar days
        const totalDays = new Date(year, month + 1, 0).getDate();
        return Math.round((dayOfMonth / totalDays) * 100 * 10) / 10;
    }

    // Count elapsed working days up to and including today
    const todayStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const offDaySet = new Set(config.off_days.map((d) => d.date));

    let elapsedWorking = 0;
    for (let d = 1; d <= dayOfMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (!offDaySet.has(dateStr)) elapsedWorking++;
    }

    if (config.working_days === 0) return 0;
    return Math.round((elapsedWorking / config.working_days) * 100 * 10) / 10;
};

const TimePassRegister = mongoose.model("TimePassRegister", timePassRegisterSchema);

module.exports = TimePassRegister;
