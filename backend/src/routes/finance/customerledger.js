const express = require("express");
const router = express.Router();
const CustomerLedger = require("../../models/CustomerLedger");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

/**
 * @route   GET /finance/customerledger
 * @desc    Get all customer ledger entries with filtering, sorting, and pagination
 * @access  Private (customerledger:read)
 */
router.get("/", authenticate, requireApiPermission("customerledger:read"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      distributor_id,
      voucher_type,
      start_date,
      end_date,
      sort_by = "transaction_date",
      sort_order = "desc",
    } = req.query;

    const query = {};

    // Filter by distributor_id (required for distributors viewing their own ledger)
    if (distributor_id) {
      query.distributor_id = distributor_id;
    } else if (req.user.role?.role_name === "Distributor" && req.user.distributor_id) {
      // Distributors can only see their own ledger
      query.distributor_id = req.user.distributor_id;
    }

    // Search across voucher_no
    if (search) {
      query.$or = [
        { voucher_no: { $regex: search, $options: "i" } },
        { voucher_type: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by voucher_type
    if (voucher_type) {
      query.voucher_type = voucher_type;
    }

    // Filter by date range
    if (start_date || end_date) {
      query.transaction_date = {};
      if (start_date) {
        query.transaction_date.$gte = new Date(start_date);
      }
      if (end_date) {
        query.transaction_date.$lte = new Date(end_date);
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sort_by] = sort_order === "asc" ? 1 : -1;

    // Get entries with running balance calculation
    const entries = await CustomerLedger.find(query)
      .populate("distributor_id", "name")
      .populate("created_by", "username")
      .populate("updated_by", "username")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await CustomerLedger.countDocuments(query);

    // Calculate running balance (closing)
    let runningBalance = 0;

    // Get all entries up to this page for accurate closing balance
    if (entries.length > 0 && query.distributor_id) {
      const allPreviousEntries = await CustomerLedger.find({
        distributor_id: query.distributor_id,
        transaction_date: { $lte: entries[entries.length - 1].transaction_date },
      })
        .sort({ transaction_date: 1, _id: 1 })
        .select("debit credit")
        .lean();

      // Calculate running balance for each entry
      const entriesWithClosing = [];
      let balance = 0;

      for (const entry of allPreviousEntries) {
        balance += (entry.debit || 0) - (entry.credit || 0);

        // Find matching entry in current page
        const currentEntry = entries.find((e) => e._id.toString() === entry._id.toString());
        if (currentEntry) {
          entriesWithClosing.push({
            ...currentEntry,
            closing: Math.round(balance * 100) / 100,
          });
        }
      }

      res.json({
        success: true,
        data: {
          entries: entriesWithClosing.length > 0 ? entriesWithClosing : entries,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } else {
      // No distributor filter or no entries
      res.json({
        success: true,
        data: {
          entries: entries.map((entry) => ({
            ...entry,
            closing: 0,
          })),
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    }
  } catch (error) {
    console.error("Error fetching customer ledger:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledger entries",
      error: error.message,
    });
  }
});

/**
 * @route   GET /finance/customerledger/:id
 * @desc    Get single customer ledger entry by ID
 * @access  Private (customerledger:read)
 */
router.get("/:id", authenticate, requireApiPermission("customerledger:read"), async (req, res) => {
  try {
    const entry = await CustomerLedger.findById(req.params.id)
      .populate("distributor_id", "name")
      .populate("created_by", "username")
      .populate("updated_by", "username");

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Customer ledger entry not found",
      });
    }

    // Distributors can only view their own entries
    if (
      req.user.role?.role_name === "Distributor" &&
      entry.distributor_id._id.toString() !== req.user.distributor_id?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("Error fetching customer ledger entry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer ledger entry",
      error: error.message,
    });
  }
});

/**
 * @route   POST /finance/customerledger
 * @desc    Create new customer ledger entry
 * @access  Private (customerledger:create)
 */
router.post("/", authenticate, requireApiPermission("customerledger:create"), async (req, res) => {
  try {
    const { distributor_id, transaction_date, voucher_type, voucher_no, debit, credit, note } =
      req.body;

    // Validation
    if (!distributor_id || !transaction_date || !voucher_type || !voucher_no) {
      return res.status(400).json({
        success: false,
        message: "Distributor ID, transaction date, voucher type, and voucher number are required",
      });
    }

    if ((debit || 0) === 0 && (credit || 0) === 0) {
      return res.status(400).json({
        success: false,
        message: "Either debit or credit must be non-zero",
      });
    }

    if ((debit || 0) > 0 && (credit || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: "A transaction cannot have both debit and credit",
      });
    }

    // Check for duplicate voucher_no for the same distributor
    const existingEntry = await CustomerLedger.findOne({
      distributor_id,
      voucher_no,
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: `Voucher number ${voucher_no} already exists for this distributor`,
      });
    }

    const entry = new CustomerLedger({
      distributor_id,
      transaction_date: new Date(transaction_date),
      voucher_type,
      voucher_no,
      debit: debit || 0,
      credit: credit || 0,
      note,
      created_by: req.user._id,
    });

    await entry.save();

    const populatedEntry = await CustomerLedger.findById(entry._id)
      .populate("distributor_id", "name")
      .populate("created_by", "username");

    res.status(201).json({
      success: true,
      message: "Customer ledger entry created successfully",
      data: populatedEntry,
    });
  } catch (error) {
    console.error("Error creating customer ledger entry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create customer ledger entry",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /finance/customerledger/:id
 * @desc    Update customer ledger entry
 * @access  Private (customerledger:update)
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("customerledger:update"),
  async (req, res) => {
    try {
      const { transaction_date, voucher_type, voucher_no, debit, credit, note } = req.body;

      const entry = await CustomerLedger.findById(req.params.id);

      if (!entry) {
        return res.status(404).json({
          success: false,
          message: "Customer ledger entry not found",
        });
      }

      // Check if voucher_no is being changed and if it conflicts
      if (voucher_no && voucher_no !== entry.voucher_no) {
        const existingEntry = await CustomerLedger.findOne({
          distributor_id: entry.distributor_id,
          voucher_no,
          _id: { $ne: req.params.id },
        });

        if (existingEntry) {
          return res.status(400).json({
            success: false,
            message: `Voucher number ${voucher_no} already exists for this distributor`,
          });
        }
      }

      // Validation for debit/credit
      const newDebit = debit !== undefined ? debit : entry.debit;
      const newCredit = credit !== undefined ? credit : entry.credit;

      if (newDebit === 0 && newCredit === 0) {
        return res.status(400).json({
          success: false,
          message: "Either debit or credit must be non-zero",
        });
      }

      if (newDebit > 0 && newCredit > 0) {
        return res.status(400).json({
          success: false,
          message: "A transaction cannot have both debit and credit",
        });
      }

      // Update fields
      if (transaction_date) entry.transaction_date = new Date(transaction_date);
      if (voucher_type) entry.voucher_type = voucher_type;
      if (voucher_no) entry.voucher_no = voucher_no;
      if (debit !== undefined) entry.debit = debit;
      if (credit !== undefined) entry.credit = credit;
      if (note !== undefined) entry.note = note;
      entry.updated_by = req.user._id;

      await entry.save();

      const updatedEntry = await CustomerLedger.findById(entry._id)
        .populate("distributor_id", "name")
        .populate("created_by", "username")
        .populate("updated_by", "username");

      res.json({
        success: true,
        message: "Customer ledger entry updated successfully",
        data: updatedEntry,
      });
    } catch (error) {
      console.error("Error updating customer ledger entry:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update customer ledger entry",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /finance/customerledger/:id
 * @desc    Delete customer ledger entry
 * @access  Private (customerledger:delete)
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("customerledger:delete"),
  async (req, res) => {
    try {
      const entry = await CustomerLedger.findById(req.params.id);

      if (!entry) {
        return res.status(404).json({
          success: false,
          message: "Customer ledger entry not found",
        });
      }

      await CustomerLedger.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Customer ledger entry deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting customer ledger entry:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete customer ledger entry",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /finance/customerledger/distributor/:distributor_id/balance
 * @desc    Get current balance for a distributor
 * @access  Private (customerledger:read)
 */
router.get(
  "/distributor/:distributor_id/balance",
  authenticate,
  requireApiPermission("customerledger:read"),
  async (req, res) => {
    try {
      const { distributor_id } = req.params;

      // Distributors can only view their own balance
      if (
        req.user.role?.role_name === "Distributor" &&
        distributor_id !== req.user.distributor_id?.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const entries = await CustomerLedger.find({ distributor_id })
        .sort({ transaction_date: 1, _id: 1 })
        .select("debit credit transaction_date");

      let balance = 0;
      entries.forEach((entry) => {
        balance += (entry.debit || 0) - (entry.credit || 0);
      });

      res.json({
        success: true,
        data: {
          distributor_id,
          current_balance: Math.round(balance * 100) / 100,
          total_entries: entries.length,
          last_transaction_date:
            entries.length > 0 ? entries[entries.length - 1].transaction_date : null,
        },
      });
    } catch (error) {
      console.error("Error calculating balance:", error);
      res.status(500).json({
        success: false,
        message: "Failed to calculate balance",
        error: error.message,
      });
    }
  }
);

module.exports = router;
