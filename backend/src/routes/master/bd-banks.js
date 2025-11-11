/**
 * BD Banks Routes
 * Handles Bangladesh banks master data
 */

const express = require("express");
const router = express.Router();
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const BdBank = require("../../models/BdBank");

/**
 * GET /master/bd-banks
 * Get all banks (with optional search and pagination)
 */
router.get("/", authenticate, requireApiPermission("bdbank:read"), async (req, res) => {
  try {
    const { search, page = 1, limit = 100, active } = req.query;

    const query = {};

    // Filter by active status if provided
    if (active !== undefined) {
      query.active = active === "true";
    }

    // Search by name
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { short_name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [banks, total] = await Promise.all([
      BdBank.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      BdBank.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        banks,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching BD banks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banks",
      error: error.message,
    });
  }
});

/**
 * GET /master/bd-banks/active
 * Get all active banks (for dropdowns)
 */
router.get("/active", authenticate, requireApiPermission("bdbank:read"), async (req, res) => {
  try {
    const banks = await BdBank.find({ active: true })
      .select("name short_name bank_code")
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: banks,
    });
  } catch (error) {
    console.error("Error fetching active BD banks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active banks",
      error: error.message,
    });
  }
});

/**
 * GET /master/bd-banks/:id
 * Get single bank by ID
 */
router.get("/:id", authenticate, requireApiPermission("bdbank:read"), async (req, res) => {
  try {
    const bank = await BdBank.findById(req.params.id).lean();

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    res.json({
      success: true,
      data: bank,
    });
  } catch (error) {
    console.error("Error fetching BD bank:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bank",
      error: error.message,
    });
  }
});

/**
 * POST /master/bd-banks
 * Create new bank
 */
router.post("/", authenticate, requireApiPermission("bdbank:create"), async (req, res) => {
  try {
    const { name, short_name, bank_code, swift_code, routing_number, active } = req.body;

    // Check if bank with same name exists
    const existingBank = await BdBank.findOne({ name });
    if (existingBank) {
      return res.status(400).json({
        success: false,
        message: "Bank with this name already exists",
      });
    }

    const bank = new BdBank({
      name,
      short_name,
      bank_code,
      swift_code,
      routing_number,
      active: active !== undefined ? active : true,
      created_by: req.user._id,
    });

    await bank.save();

    res.status(201).json({
      success: true,
      message: "Bank created successfully",
      data: bank,
    });
  } catch (error) {
    console.error("Error creating BD bank:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create bank",
      error: error.message,
    });
  }
});

/**
 * PUT /master/bd-banks/:id
 * Update bank
 */
router.put("/:id", authenticate, requireApiPermission("bdbank:update"), async (req, res) => {
  try {
    const { name, short_name, bank_code, swift_code, routing_number, active } = req.body;

    const bank = await BdBank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    // Check if new name conflicts with existing bank
    if (name && name !== bank.name) {
      const existingBank = await BdBank.findOne({ name });
      if (existingBank) {
        return res.status(400).json({
          success: false,
          message: "Bank with this name already exists",
        });
      }
    }

    // Update fields
    if (name) bank.name = name;
    if (short_name !== undefined) bank.short_name = short_name;
    if (bank_code !== undefined) bank.bank_code = bank_code;
    if (swift_code !== undefined) bank.swift_code = swift_code;
    if (routing_number !== undefined) bank.routing_number = routing_number;
    if (active !== undefined) bank.active = active;
    bank.updated_by = req.user._id;

    await bank.save();

    res.json({
      success: true,
      message: "Bank updated successfully",
      data: bank,
    });
  } catch (error) {
    console.error("Error updating BD bank:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update bank",
      error: error.message,
    });
  }
});

/**
 * DELETE /master/bd-banks/:id
 * Delete bank (soft delete by setting active = false)
 */
router.delete("/:id", authenticate, requireApiPermission("bdbank:delete"), async (req, res) => {
  try {
    const bank = await BdBank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    // Soft delete
    bank.active = false;
    bank.updated_by = req.user._id;
    await bank.save();

    res.json({
      success: true,
      message: "Bank deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting BD bank:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete bank",
      error: error.message,
    });
  }
});

module.exports = router;
