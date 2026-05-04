const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const TimePassRegister = require("../../models/TimePassRegister");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

// ─── helpers ────────────────────────────────────────────────────────────────

const sendError = (res, status, message, error) =>
    res.status(status).json({ success: false, message, ...(error && { error }) });

const validationFail = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
    }
    return null;
};

// ─── GET /  — list all months ────────────────────────────────────────────────

router.get(
    "/",
    authenticate,
    requireApiPermission("time-pass-register:read"),
    [
        query("page").optional().isInt({ min: 1 }).toInt(),
        query("limit").optional().isInt({ min: 1, max: 120 }).toInt(),
        query("search").optional().isString().trim(),
        query("sort_by").optional().isIn(["year_month", "working_days", "created_at"]),
        query("sort_order").optional().isIn(["asc", "desc"]),
    ],
    async (req, res) => {
        try {
            if (validationFail(req, res)) return;

            const {
                page = 1,
                limit = 24,
                search = "",
                sort_by = "year_month",
                sort_order = "desc",
            } = req.query;

            const filter = {};
            if (search) {
                filter.year_month = { $regex: search, $options: "i" };
            }

            const skip = (page - 1) * limit;
            const sortOptions = { [sort_by]: sort_order === "asc" ? 1 : -1 };

            const [records, total] = await Promise.all([
                TimePassRegister.find(filter)
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(limit)
                    .populate("created_by", "username")
                    .populate("updated_by", "username")
                    .lean(),
                TimePassRegister.countDocuments(filter),
            ]);

            res.json({
                success: true,
                data: {
                    records,
                    pagination: {
                        total,
                        page,
                        limit,
                        pages: Math.ceil(total / limit),
                    },
                },
            });
        } catch (err) {
            console.error("time-pass-register GET /", err);
            sendError(res, 500, "Error fetching time pass registers", err.message);
        }
    }
);

// ─── GET /current  — Time Pass % for today (accessible to all roles) ─────────

router.get("/current", authenticate, async (req, res) => {
    try {
        const today = new Date();
        const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        const config = await TimePassRegister.getByMonth(yearMonth);
        const pct = TimePassRegister.computeTimePassPct(config, today);

        res.json({
            success: true,
            data: {
                year_month: yearMonth,
                time_pass_pct: pct,
                working_days: config?.working_days ?? null,
                elapsed_working_days: config
                    ? (() => {
                        const offSet = new Set(config.off_days.map((d) => d.date));
                        let count = 0;
                        for (let d = 1; d <= today.getDate(); d++) {
                            const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                            if (!offSet.has(ds)) count++;
                        }
                        return count;
                    })()
                    : null,
                configured: !!config,
            },
        });
    } catch (err) {
        console.error("time-pass-register GET /current", err);
        sendError(res, 500, "Error computing time pass", err.message);
    }
});

// ─── GET /:yearMonth  — single month config ───────────────────────────────────

router.get(
    "/:yearMonth",
    authenticate,
    requireApiPermission("time-pass-register:read"),
    [param("yearMonth").matches(/^\d{4}-\d{2}$/).withMessage("yearMonth must be YYYY-MM")],
    async (req, res) => {
        try {
            if (validationFail(req, res)) return;

            const record = await TimePassRegister.findOne({ year_month: req.params.yearMonth })
                .populate("created_by", "username")
                .populate("updated_by", "username");

            if (!record) {
                return res.status(404).json({ success: false, message: "Month config not found" });
            }

            res.json({ success: true, data: record });
        } catch (err) {
            console.error("time-pass-register GET /:yearMonth", err);
            sendError(res, 500, "Error fetching month config", err.message);
        }
    }
);

// ─── POST /  — create month config ──────────────────────────────────────────

router.post(
    "/",
    authenticate,
    requireApiPermission("time-pass-register:create"),
    [
        body("year_month")
            .matches(/^\d{4}-\d{2}$/)
            .withMessage("year_month must be YYYY-MM"),
        body("off_days").optional().isArray(),
        body("off_days.*.date")
            .optional()
            .matches(/^\d{4}-\d{2}-\d{2}$/)
            .withMessage("off_days date must be YYYY-MM-DD"),
        body("off_days.*.type")
            .optional()
            .isIn(["weekly_off", "holiday"])
            .withMessage("off_days type must be weekly_off or holiday"),
        body("off_days.*.note").optional().isString().isLength({ max: 200 }),
    ],
    async (req, res) => {
        try {
            if (validationFail(req, res)) return;

            const { year_month, off_days = [] } = req.body;

            const existing = await TimePassRegister.findOne({ year_month });
            if (existing) {
                return res.status(409).json({ success: false, message: "Config for this month already exists. Use PUT to update." });
            }

            // Compute total_days from year_month
            const [y, m] = year_month.split("-").map(Number);
            const total_days = new Date(y, m, 0).getDate();

            const record = new TimePassRegister({
                year_month,
                total_days,
                off_days,
                created_by: req.user._id,
                updated_by: req.user._id,
            });

            await record.save();

            res.status(201).json({ success: true, message: "Month config created", data: record });
        } catch (err) {
            console.error("time-pass-register POST /", err);
            if (err.code === 11000) {
                return sendError(res, 409, "Config for this month already exists");
            }
            sendError(res, 500, "Error creating month config", err.message);
        }
    }
);

// ─── PUT /:yearMonth  — upsert month config (full replace of off_days) ────────

router.put(
    "/:yearMonth",
    authenticate,
    requireApiPermission("time-pass-register:update"),
    [
        param("yearMonth").matches(/^\d{4}-\d{2}$/).withMessage("yearMonth must be YYYY-MM"),
        body("off_days").isArray(),
        body("off_days.*.date")
            .matches(/^\d{4}-\d{2}-\d{2}$/)
            .withMessage("off_days date must be YYYY-MM-DD"),
        body("off_days.*.type")
            .isIn(["weekly_off", "holiday"])
            .withMessage("off_days type must be weekly_off or holiday"),
        body("off_days.*.note").optional().isString().isLength({ max: 200 }),
    ],
    async (req, res) => {
        try {
            if (validationFail(req, res)) return;

            const { yearMonth } = req.params;
            const { off_days } = req.body;

            const [y, m] = yearMonth.split("-").map(Number);
            const total_days = new Date(y, m, 0).getDate();

            let record = await TimePassRegister.findOne({ year_month: yearMonth });

            if (record) {
                record.off_days = off_days;
                record.total_days = total_days;
                record.updated_by = req.user._id;
                await record.save();
            } else {
                record = new TimePassRegister({
                    year_month: yearMonth,
                    total_days,
                    off_days,
                    created_by: req.user._id,
                    updated_by: req.user._id,
                });
                await record.save();
            }

            res.json({ success: true, message: "Month config saved", data: record });
        } catch (err) {
            console.error("time-pass-register PUT /:yearMonth", err);
            sendError(res, 500, "Error saving month config", err.message);
        }
    }
);

module.exports = router;
