/**
 * Collections Routes
 * Payment collections from distributors
 * Route: /ordermanagement/collections
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const Collection = require("../../models/Collection");
const DemandOrder = require("../../models/DemandOrder");
const BdBank = require("../../models/BdBank");
const {
  notifyDistributor,
  notifyNextHandler,
  notifyDistributorOfEdit,
} = require("../../utils/collectionNotifications");

/**
 * Helper function to emit collection updates via WebSocket
 */
const emitCollectionUpdate = (action, data) => {
  if (global.io) {
    global.io.emit(`collection:${action}`, data);
    console.log(`🔌 WebSocket: collection:${action} emitted`);
  }
};

/**
 * Helper function to convert Decimal128 to string in lean queries
 */
const convertDecimal128 = (obj) => {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertDecimal128);
  }
  if (typeof obj === "object") {
    // Handle Decimal128
    if (obj instanceof mongoose.Types.Decimal128) {
      return parseFloat(obj.toString()).toFixed(2);
    }
    // Preserve ObjectIds, Dates, and other special types
    if (obj instanceof mongoose.Types.ObjectId || obj instanceof Date || obj._bsontype) {
      return obj;
    }
    // Recursively convert nested objects
    const converted = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertDecimal128(obj[key]);
      }
    }
    return converted;
  }
  return obj;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../../public/uploads/collections");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `collection-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPG, PNG, and PDF are allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
  },
});

/**
 * GET /ordermanagement/collections
 * Get collections based on user role
 * - Distributors: See their own collections
 * - Employees (ASM/RSM/ZSM/Sales Admin/Order Mgmt/Finance): See all collections (filtered by role/territory in frontend)
 */
router.get("/", authenticate, requireApiPermission("collection:read"), async (req, res) => {
  try {
    const { user } = req;
    const {
      payment_method,
      date_from,
      date_to,
      do_no,
      page = 1,
      limit = 50,
      approval_status,
      current_handler_role,
    } = req.query;

    const query = {};

    // If user is a distributor, only show their collections
    if (user.distributor_id) {
      query.distributor_id = user.distributor_id;
    }
    // If user is an employee (ASM, RSM, ZSM, Sales Admin, Order Management, Finance)
    // Show all collections (territory filtering will be done by frontend or additional filters)
    // No additional filter needed here - they can see all collections they have permission for

    // Filter by approval status
    if (approval_status) {
      query.approval_status = approval_status;
    }

    // Filter by current handler role
    if (current_handler_role) {
      query.current_handler_role = current_handler_role;
    }

    // Filter by payment method
    if (payment_method) {
      query.payment_method = payment_method;
    }

    // Filter by demand order
    if (do_no) {
      query.do_no = do_no;
    }

    // Filter by date range
    if (date_from || date_to) {
      query.deposit_date = {};
      if (date_from) {
        query.deposit_date.$gte = new Date(date_from);
      }
      if (date_to) {
        query.deposit_date.$lte = new Date(date_to);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [collections, total] = await Promise.all([
      Collection.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("company_bank", "name short_name")
        .populate("depositor_bank", "name short_name")
        .populate("created_by", "username")
        .lean(),
      Collection.countDocuments(query),
    ]);

    // Convert Decimal128 to string for all collections
    const convertedCollections = convertDecimal128(collections);

    res.json({
      success: true,
      data: {
        collections: convertedCollections,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collections",
      error: error.message,
    });
  }
});

/**
 * GET /ordermanagement/collections/:id
 * Get single collection by ID
 */
router.get("/:id", authenticate, requireApiPermission("collection:read"), async (req, res) => {
  try {
    const { user } = req;

    // Build query based on user type
    const query = { _id: req.params.id };

    // If user is a distributor, they can only view their own collections
    if (user.distributor_id) {
      query.distributor_id = user.distributor_id;
    }
    // Employees can view any collection

    const collection = await Collection.findOne(query)
      .populate("company_bank", "name short_name")
      .populate("depositor_bank", "name short_name")
      .populate("distributor_id", "name")
      .populate("created_by", "username")
      .lean();

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    // Convert Decimal128 to string
    const convertedCollection = convertDecimal128(collection);

    res.json({
      success: true,
      data: convertedCollection,
    });
  } catch (error) {
    console.error("Error fetching collection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collection",
      error: error.message,
    });
  }
});

/**
 * POST /ordermanagement/collections
 * Create new collection
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("collection:create"),
  upload.single("image"),
  async (req, res) => {
    try {
      const { user } = req;

      const {
        payment_method,
        company_bank,
        company_bank_account_no,
        depositor_bank,
        depositor_branch,
        cash_method,
        depositor_mobile,
        deposit_amount,
        deposit_date,
        do_no,
        note,
        distributor_id: providedDistributorId,
      } = req.body;

      // Determine distributor_id intelligently:
      // 1. If do_no provided, get distributor_id from the demand order (primary method for HQ users)
      // 2. Use provided distributor_id if explicitly passed
      // 3. Fall back to user's distributor_id (for field users)
      let distributorId = null;

      if (do_no) {
        const demandOrder = await DemandOrder.findOne({ order_number: do_no }).select(
          "distributor_id"
        );
        if (demandOrder) {
          distributorId = demandOrder.distributor_id;
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid demand order number",
          });
        }
      } else if (providedDistributorId) {
        distributorId = providedDistributorId;
      } else if (user.distributor_id) {
        distributorId = user.distributor_id;
      } else {
        return res.status(400).json({
          success: false,
          message: "Unable to determine distributor. Please provide a DO number.",
        });
      }

      console.log("Received collection data:", {
        payment_method,
        deposit_amount,
        deposit_amount_type: typeof deposit_amount,
        depositor_mobile,
        deposit_date,
        distributorId,
      });

      // Validate required fields
      if (!payment_method) {
        return res.status(400).json({
          success: false,
          message: "Payment method is required",
        });
      }

      if (!depositor_mobile || !deposit_amount || !deposit_date) {
        return res.status(400).json({
          success: false,
          message: "Depositor mobile, deposit amount, and deposit date are required",
        });
      }

      // Validate deposit_amount
      const amount = parseFloat(deposit_amount);
      console.log("Parsed amount:", amount, "isNaN:", isNaN(amount));
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Deposit amount must be greater than 0",
        });
      }

      // If do_no provided, verify it exists and belongs to the distributor
      if (do_no) {
        const demandOrder = await DemandOrder.findOne({
          order_number: do_no,
          distributor_id: distributorId,
        });

        if (!demandOrder) {
          return res.status(400).json({
            success: false,
            message: "Invalid demand order number or order does not belong to this distributor",
          });
        }
      }

      // Prepare collection data
      const collectionData = {
        distributor_id: distributorId,
        payment_method,
        depositor_mobile,
        deposit_amount: amount,
        deposit_date: new Date(deposit_date),
        do_no: do_no || null,
        note: note || null,
        created_by: user._id,
      };

      // Add payment method specific fields
      if (payment_method === "Bank") {
        collectionData.company_bank = company_bank;
        collectionData.company_bank_account_no = company_bank_account_no;
        collectionData.depositor_bank = depositor_bank;
        collectionData.depositor_branch = depositor_branch;
      } else if (payment_method === "Cash") {
        collectionData.cash_method = cash_method;
      }

      // Add image if uploaded
      if (req.file) {
        collectionData.image = {
          file_name: req.file.originalname,
          file_path: `/uploads/collections/${req.file.filename}`,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          uploaded_at: new Date(),
        };
      }

      // Create collection
      console.log("collectionData before save:", JSON.stringify(collectionData, null, 2));
      const collection = new Collection(collectionData);
      console.log("collection.deposit_amount before save:", collection.deposit_amount);
      await collection.save();

      // Update the initial approval chain entry with actual username
      if (
        collection.approval_chain.length > 0 &&
        collection.approval_chain[0].action === "submit"
      ) {
        collection.approval_chain[0].performed_by_name = user.username;
        await collection.save();
      }

      console.log("collection.deposit_amount after save:", collection.deposit_amount);

      // Populate for response
      const populatedCollection = await Collection.findById(collection._id)
        .populate("company_bank", "name short_name")
        .populate("depositor_bank", "name short_name")
        .populate("created_by", "username")
        .lean();

      console.log("populatedCollection.deposit_amount:", populatedCollection.deposit_amount);

      // Convert Decimal128 to string
      const convertedCollection = convertDecimal128(populatedCollection);
      console.log("convertedCollection.deposit_amount:", convertedCollection.deposit_amount);

      // Emit WebSocket event for real-time updates
      emitCollectionUpdate("created", convertedCollection);

      res.status(201).json({
        success: true,
        message: "Collection created successfully",
        data: convertedCollection,
      });
    } catch (error) {
      console.error("Error creating collection:", error);

      // Clean up uploaded file if error occurs
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to create collection",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /ordermanagement/collections/:id
 * Delete collection (only if created recently and no linked DO)
 */
router.delete("/:id", authenticate, requireApiPermission("collection:delete"), async (req, res) => {
  try {
    const { user } = req;

    // Build query based on user type
    const query = { _id: req.params.id };

    // If user is a distributor, they can only delete their own collections
    if (user.distributor_id) {
      query.distributor_id = user.distributor_id;
    }
    // Employees with delete permission can delete any collection

    const collection = await Collection.findOne(query);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    // Optional: Add business rules for deletion
    // e.g., can only delete if created within last 24 hours
    // e.g., cannot delete if linked to demand order

    // Delete image file if exists
    if (collection.image && collection.image.file_path) {
      const filePath = path.join(__dirname, "../../../public", collection.image.file_path);
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error("Error deleting image file:", unlinkError);
      }
    }

    await collection.deleteOne();

    // Emit WebSocket event for real-time updates
    emitCollectionUpdate("deleted", { id: collection._id.toString() });

    res.json({
      success: true,
      message: "Collection deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting collection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete collection",
      error: error.message,
    });
  }
});

/**
 * POST /ordermanagement/collections/:id/forward
 * Forward/Submit collection to next approver
 * - Distributors use collection:submit for pending → ASM
 * - Other roles use collection:forward for subsequent approvals
 */
router.post(
  "/:id/forward",
  authenticate,
  async (req, res) => {
    try {
      const { user } = req;
      const { comments } = req.body;

      const collection = await Collection.findById(req.params.id);

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Collection not found",
        });
      }

      // Check if user has permission to forward based on current status
      const roleMapping = {
        forwarded_to_area_manager: "ASM",
        forwarded_to_regional_manager: "RSM",
        forwarded_to_zonal_manager_and_sales_admin: "Sales Admin",
        returned_to_sales_admin: "Sales Admin", // After return from Order Mgmt or Finance
        forwarded_to_order_management: "Order Management",
        forwarded_to_finance: "Finance",
        pending: "Distributor",
      };

      const currentRole = roleMapping[collection.approval_status];
      if (user.role_id.role !== currentRole) {
        return res.status(403).json({
          success: false,
          message: `Only ${currentRole} can forward this collection at this stage`,
        });
      }

      // Check permissions based on status
      if (collection.approval_status === "pending") {
        // Distributors need collection:submit permission
        const hasSubmitPermission = user.permissions?.includes("collection:submit");
        if (!hasSubmitPermission) {
          return res.status(403).json({
            success: false,
            message: "API access denied - Missing collection:submit permission",
          });
        }
      } else {
        // Other roles need collection:forward permission
        const hasForwardPermission = user.permissions?.includes("collection:forward");
        if (!hasForwardPermission) {
          return res.status(403).json({
            success: false,
            message: "API access denied - Missing collection:forward permission",
          });
        }
      }

      // Determine next status and role
      let nextStatus, nextRole;
      switch (collection.approval_status) {
        case "pending":
          nextStatus = "forwarded_to_area_manager";
          nextRole = "ASM";
          break;
        case "forwarded_to_area_manager":
          nextStatus = "forwarded_to_regional_manager";
          nextRole = "RSM";
          break;
        case "forwarded_to_regional_manager":
          nextStatus = "forwarded_to_zonal_manager_and_sales_admin";
          nextRole = "Sales Admin"; // ZSM is view-only
          break;
        case "forwarded_to_zonal_manager_and_sales_admin":
          nextStatus = "forwarded_to_order_management";
          nextRole = "Order Management";
          break;
        case "returned_to_sales_admin":
          // Sales Admin can re-forward after rework
          nextStatus = "forwarded_to_order_management";
          nextRole = "Order Management";
          break;
        case "forwarded_to_order_management":
          nextStatus = "forwarded_to_finance";
          nextRole = "Finance";
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Collection cannot be forwarded from current status",
          });
      }

      // Update collection
      collection.approval_status = nextStatus;
      collection.current_handler_role = nextRole;
      collection.approval_chain.push({
        action: "forward",
        from_role: user.role_id.role,
        to_role: nextRole,
        performed_by: user._id,
        performed_by_name: user.username,
        comments: comments || `Forwarded to ${nextRole}`,
        timestamp: new Date(),
      });
      collection.updated_by = user._id;

      await collection.save();

      // Emit WebSocket event for real-time updates
      emitCollectionUpdate("updated", collection);

      // Send notifications
      const forwardedBy = `${user.role_id.role} (${user.username})`;
      await notifyDistributor(collection, "forwarded", forwardedBy, comments);
      await notifyNextHandler(collection, nextRole, forwardedBy, comments);

      res.json({
        success: true,
        message: `Collection forwarded to ${nextRole}`,
        data: collection,
      });
    } catch (error) {
      console.error("Error forwarding collection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to forward collection",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/collections/:id/cancel
 * Cancel collection
 */
router.post(
  "/:id/cancel",
  authenticate,
  requireApiPermission("collection:cancel"),
  async (req, res) => {
    try {
      const { user } = req;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Cancellation reason is required",
        });
      }

      const collection = await Collection.findById(req.params.id);

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Collection not found",
        });
      }

      if (collection.approval_status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Collection is already cancelled",
        });
      }

      if (collection.approval_status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel an approved collection",
        });
      }

      // Update collection
      collection.approval_status = "cancelled";
      collection.cancelled_by = user._id;
      collection.cancelled_at = new Date();
      collection.cancellation_reason = reason;
      collection.approval_chain.push({
        action: "cancel",
        from_role: user.role_id.role,
        to_role: "Distributor",
        performed_by: user._id,
        performed_by_name: user.username,
        comments: reason,
        timestamp: new Date(),
      });
      collection.updated_by = user._id;

      await collection.save();

      // Send notification to distributor
      const cancelledBy = `${user.role_id.role} (${user.username})`;
      await notifyDistributor(collection, "cancelled", cancelledBy, reason);

      // Emit WebSocket event
      emitCollectionUpdate("updated", collection);

      res.json({
        success: true,
        message: "Collection cancelled successfully",
        data: collection,
      });
    } catch (error) {
      console.error("Error cancelling collection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel collection",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/collections/:id/return
 * Return collection to Sales Admin for rework (Order Management or Finance)
 */
router.post(
  "/:id/return",
  authenticate,
  requireApiPermission("collection:return"),
  async (req, res) => {
    try {
      const { user } = req;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Return reason is required",
        });
      }

      // Only Order Management and Finance can return
      if (!["Order Management", "Finance"].includes(user.role_id.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Order Management or Finance can return collections",
        });
      }

      const collection = await Collection.findById(req.params.id).populate("distributor_id");

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Collection not found",
        });
      }

      // Cannot return approved or cancelled collections
      if (collection.approval_status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Cannot return an approved collection",
        });
      }

      if (collection.approval_status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot return a cancelled collection",
        });
      }

      // Verify current status matches user role
      if (
        user.role_id.role === "Order Management" &&
        collection.approval_status !== "forwarded_to_order_management"
      ) {
        return res.status(403).json({
          success: false,
          message: "Collection is not currently with Order Management",
        });
      }

      if (
        user.role_id.role === "Finance" &&
        collection.approval_status !== "forwarded_to_finance"
      ) {
        return res.status(403).json({
          success: false,
          message: "Collection is not currently with Finance",
        });
      }

      // Update collection - return to Sales Admin for rework
      collection.approval_status = "returned_to_sales_admin";
      collection.current_handler_role = "Sales Admin";
      collection.approval_chain.push({
        action: "return",
        from_role: user.role_id.role,
        to_role: "Sales Admin",
        performed_by: user._id,
        performed_by_name: user.username,
        comments: reason,
        timestamp: new Date(),
      });
      collection.updated_by = user._id;

      await collection.save();

      // Send notifications
      const returnedBy = `${user.role_id.role} (${user.username})`;
      const {
        notifyDistributor,
        notifyNextHandler,
      } = require("../../utils/collectionNotifications");

      // Notify distributor about return
      await notifyDistributor(collection, "returned", returnedBy, reason);

      // Notify Sales Admin
      await notifyNextHandler(collection, "Sales Admin", returnedBy, reason);

      res.json({
        success: true,
        message: "Collection returned to Sales Admin for rework",
        data: collection,
      });
    } catch (error) {
      console.error("Error returning collection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to return collection",
        error: error.message,
      });
    }
  }
);

/**
 * POST /ordermanagement/collections/:id/approve
 * Approve collection (Finance only)
 */
router.post(
  "/:id/approve",
  authenticate,
  requireApiPermission("collection:approve"),
  async (req, res) => {
    try {
      const { user } = req;
      const { comments } = req.body;

      // Only Finance can approve
      if (user.role_id.role !== "Finance") {
        return res.status(403).json({
          success: false,
          message: "Only Finance role can approve collections",
        });
      }

      const collection = await Collection.findById(req.params.id).populate("distributor_id");

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Collection not found",
        });
      }

      // Finance can approve payments in two scenarios:
      // 1. Independent payments: Must be "forwarded_to_finance" (reached through approval chain)
      // 2. DO-attached payments: Can be "pending" or "forwarded_to_finance" (Finance approves when DO reaches them)
      // Finance is the FINAL approver for both types (Distribution only handles DO fulfillment, not payment approval)
      const validStatusesForApproval = ["pending", "forwarded_to_finance"];

      if (!validStatusesForApproval.includes(collection.approval_status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve payment with status: ${collection.approval_status}. Only pending or forwarded_to_finance payments can be approved.`,
        });
      }

      if (collection.approval_status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Collection is already approved",
        });
      }

      // Update collection
      collection.approval_status = "approved";
      collection.approved_by = user._id;
      collection.approved_at = new Date();
      collection.approval_chain.push({
        action: "approve",
        from_role: "Finance",
        to_role: "Distributor",
        performed_by: user._id,
        performed_by_name: user.username,
        comments: comments || "Payment approved",
        timestamp: new Date(),
      });
      collection.updated_by = user._id;

      // Create CustomerLedger entry (Credit - payment received)
      const CustomerLedger = require("../../models/CustomerLedger");
      const ledgerEntry = await CustomerLedger.create({
        distributor_id: collection.distributor_id._id,
        particulars: `Receipt #${collection.transaction_id}`,
        transaction_date: collection.deposit_date,
        voucher_type: "Rec",
        voucher_no: collection.transaction_id,
        debit: 0,
        credit: parseFloat(collection.deposit_amount.toString()),
        note: "",
        created_by: user._id,
      });

      collection.ledger_entry_id = ledgerEntry._id;
      await collection.save();

      // Send notification to distributor
      const approvedBy = `${user.role_id.role} (${user.username})`;
      await notifyDistributor(collection, "approved", approvedBy, comments);

      // Emit WebSocket event
      emitCollectionUpdate("updated", collection);

      res.json({
        success: true,
        message: "Collection approved successfully",
        data: {
          collection,
          ledger_entry: ledgerEntry,
        },
      });
    } catch (error) {
      console.error("Error approving collection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve collection",
        error: error.message,
      });
    }
  }
);

/**
 * PUT /ordermanagement/collections/:id/edit
 * Edit collection (Area Manager, Regional Manager, Sales Admin, Order Management, Finance)
 */
router.put(
  "/:id/edit",
  authenticate,
  requireApiPermission("collection:edit"),
  upload.single("image"),
  async (req, res) => {
    try {
      const { user } = req;

      const collection = await Collection.findById(req.params.id);

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Collection not found",
        });
      }

      // Cannot edit approved or cancelled collections
      if (collection.approval_status === "approved" || collection.approval_status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot edit approved or cancelled collections",
        });
      }

      // Track changes
      const changes = [];
      const fieldLabels = {
        payment_method: "Payment Method",
        company_bank: "Company Bank",
        company_bank_account_no: "Company Bank Account",
        depositor_bank: "Depositor Bank",
        depositor_branch: "Depositor Branch",
        cash_method: "Cash Method",
        depositor_mobile: "Depositor Mobile",
        deposit_amount: "Deposit Amount",
        deposit_date: "Deposit Date",
        note: "Note",
        do_no: "DO Number",
      };

      // Update allowed fields and track changes
      const allowedFields = [
        "payment_method",
        "company_bank",
        "company_bank_account_no",
        "depositor_bank",
        "depositor_branch",
        "cash_method",
        "depositor_mobile",
        "deposit_amount",
        "deposit_date",
        "note",
        "do_no",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          const oldValue = collection[field];
          const newValue = req.body[field];

          // Check if value actually changed
          if (String(oldValue) !== String(newValue)) {
            changes.push(`${fieldLabels[field]}: ${oldValue || "empty"} → ${newValue || "empty"}`);
          }

          collection[field] = newValue;
        }
      });

      // Handle image replacement
      if (req.file) {
        changes.push(`Image: Replaced with ${req.file.originalname}`);

        // Delete old image if exists
        if (collection.image && collection.image.file_path) {
          const oldFilePath = path.join(__dirname, "../../../public", collection.image.file_path);
          try {
            await fs.unlink(oldFilePath);
          } catch (unlinkError) {
            console.error("Error deleting old image:", unlinkError);
          }
        }

        // Save new image
        collection.image = {
          file_name: req.file.filename,
          file_path: `/uploads/collections/${req.file.filename}`,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          uploaded_at: new Date(),
        };
      }

      // Build change summary
      const changeSummary =
        changes.length > 0 ? `Updated: ${changes.join("; ")}` : "No changes detected";

      // Record edit in approval chain
      collection.approval_chain.push({
        action: "edit",
        from_role: user.role_id.role,
        to_role: user.role_id.role,
        performed_by: user._id,
        performed_by_name: user.username,
        comments: changeSummary,
        timestamp: new Date(),
      });

      collection.updated_by = user._id;
      await collection.save();

      // Notify distributor of edit
      const editedBy = `${user.role_id.role} (${user.username})`;
      await notifyDistributorOfEdit(collection, editedBy, "Collection details updated");

      // Emit WebSocket event
      emitCollectionUpdate("updated", collection);

      res.json({
        success: true,
        message: "Collection updated successfully",
        data: collection,
      });
    } catch (error) {
      console.error("Error editing collection:", error);

      // Clean up uploaded file if error occurs
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: "Failed to update collection",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /ordermanagement/collections/:id/image
 * Delete collection image (Area Manager and above can delete and re-upload)
 */
router.delete(
  "/:id/image",
  authenticate,
  requireApiPermission("collection:edit"),
  async (req, res) => {
    try {
      const collection = await Collection.findById(req.params.id);

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: "Collection not found",
        });
      }

      // Cannot edit approved or cancelled collections
      if (collection.approval_status === "approved" || collection.approval_status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot modify approved or cancelled collections",
        });
      }

      if (!collection.image || !collection.image.file_path) {
        return res.status(404).json({
          success: false,
          message: "No image found for this collection",
        });
      }

      // Delete image file from filesystem
      const filePath = path.join(__dirname, "../../../public", collection.image.file_path);
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error("Error deleting image file:", unlinkError);
      }

      // Remove image from collection document
      collection.image = undefined;
      await collection.save();

      res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting collection image:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete image",
        error: error.message,
      });
    }
  }
);

module.exports = router;
