const express = require("express");
const router = express.Router();
const Bank = require("../../models/Bank");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

/**
 * @route   GET /api/v1/master/banks
 * @desc    Get all banks with pagination and filtering
 * @access  Private
 */
router.get("/", authenticate, requireApiPermission("banks:read"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      active,
      sort_by = "bank_name",
      sort_order = "asc",
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { bank_name: { $regex: search, $options: "i" } },
        { sales_organization: { $regex: search, $options: "i" } },
        { account_no: { $regex: search, $options: "i" } },
      ];
    }

    // Active filter
    if (active !== undefined) {
      query.active = active === "true";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sort_by] = sort_order === "asc" ? 1 : -1;

    const [banks, total] = await Promise.all([
      Bank.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("created_by", "username")
        .populate("updated_by", "username")
        .lean(),
      Bank.countDocuments(query),
    ]);

    res.status(200).json({
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
    console.error("Error fetching banks:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching banks",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/master/banks/:id
 * @desc    Get bank by ID
 * @access  Private
 */
router.get("/:id", authenticate, requireApiPermission("banks:read"), async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id)
      .populate("created_by", "username")
      .populate("updated_by", "username");

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    res.status(200).json({
      success: true,
      data: bank,
    });
  } catch (error) {
    console.error("Error fetching bank:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bank",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/master/banks
 * @desc    Create new bank
 * @access  Private
 */
router.post("/", authenticate, requireApiPermission("banks:create"), async (req, res) => {
  try {
    const { sales_organization, bank_name, account_no } = req.body;

    // Validation
    if (!sales_organization || !bank_name || !account_no) {
      return res.status(400).json({
        success: false,
        message: "Sales organization, bank name, and account number are required",
      });
    }

    // Check if account number already exists
    const existingBank = await Bank.findOne({ account_no: account_no.trim() });
    if (existingBank) {
      return res.status(400).json({
        success: false,
        message: "Account number already exists",
      });
    }

    const bank = new Bank({
      sales_organization: sales_organization.trim(),
      bank_name: bank_name.trim(),
      account_no: account_no.trim(),
      created_by: req.user._id,
      updated_by: req.user._id,
    });

    await bank.save();

    res.status(201).json({
      success: true,
      message: "Bank created successfully",
      data: bank,
    });
  } catch (error) {
    console.error("Error creating bank:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Account number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating bank",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/v1/master/banks/:id
 * @desc    Update bank
 * @access  Private
 */
router.put("/:id", authenticate, requireApiPermission("banks:update"), async (req, res) => {
  try {
    const { sales_organization, bank_name, account_no, active } = req.body;

    const bank = await Bank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    // Check if account number is being changed and if it already exists
    if (account_no && account_no.trim() !== bank.account_no) {
      const existingBank = await Bank.findOne({ account_no: account_no.trim() });
      if (existingBank) {
        return res.status(400).json({
          success: false,
          message: "Account number already exists",
        });
      }
    }

    // Update fields
    if (sales_organization) bank.sales_organization = sales_organization.trim();
    if (bank_name) bank.bank_name = bank_name.trim();
    if (account_no) bank.account_no = account_no.trim();
    if (active !== undefined) bank.active = active;
    bank.updated_by = req.user._id;

    await bank.save();

    res.status(200).json({
      success: true,
      message: "Bank updated successfully",
      data: bank,
    });
  } catch (error) {
    console.error("Error updating bank:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Account number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating bank",
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/v1/master/banks/:id
 * @desc    Soft delete bank (set active to false)
 * @access  Private
 */
router.delete("/:id", authenticate, requireApiPermission("banks:delete"), async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    bank.active = false;
    bank.updated_by = req.user._id;
    await bank.save();

    res.status(200).json({
      success: true,
      message: "Bank deactivated successfully",
      data: bank,
    });
  } catch (error) {
    console.error("Error deleting bank:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting bank",
      error: error.message,
    });
  }
});

module.exports = router;
