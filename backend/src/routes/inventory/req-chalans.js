/**
 * Requisition Chalans & Invoices Routes
 * Manages viewing and receiving requisition chalans and invoices
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const models = require("../../models");
const { authenticate } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/checkPermission");

/**
 * GET /api/v1/inventory/req-chalans
 * List requisition chalans with filters
 */
router.get("/", authenticate, checkPermission("req-chalan:read"), async (req, res) => {
  try {
    const { facility_id } = req.user;
    const {
      status,
      requesting_depot_id,
      source_depot_id,
      from_date,
      to_date,
      page = 1,
      limit = 20,
      copy_number,
    } = req.query;

    const query = {
      $or: [
        { source_depot_id: facility_id }, // Source depot can see their sent chalans
        { requesting_depot_id: facility_id }, // Requesting depot can see their received chalans
      ],
    };

    if (status) {
      query.status = status;
    }

    if (requesting_depot_id) {
      query.requesting_depot_id = requesting_depot_id;
    }

    if (source_depot_id) {
      query.source_depot_id = source_depot_id;
    }

    if (from_date || to_date) {
      query.chalan_date = {};
      if (from_date) query.chalan_date.$gte = new Date(from_date);
      if (to_date) query.chalan_date.$lte = new Date(to_date);
    }

    // Filter by copy number if specified (default show only copy 1)
    if (copy_number) {
      query.copy_number = parseInt(copy_number);
    } else {
      query.copy_number = 1; // Default to master copy
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [chalans, total] = await Promise.all([
      models.RequisitionChalan.find(query)
        .populate("source_depot_id", "name code")
        .populate("requesting_depot_id", "name code")
        .populate("load_sheet_id", "load_sheet_number delivery_date")
        .populate("created_by", "name email")
        .sort({ chalan_date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.RequisitionChalan.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: chalans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching requisition chalans:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requisition chalans",
    });
  }
});

/**
 * GET /api/v1/inventory/req-chalans/:id
 * Get single requisition chalan details
 */
router.get("/:id", authenticate, checkPermission("req-chalan:read"), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id } = req.user;
    const { include_copies } = req.query;

    const chalan = await models.RequisitionChalan.findOne({
      _id: id,
      $or: [{ source_depot_id: facility_id }, { requesting_depot_id: facility_id }],
    })
      .populate("source_depot_id", "name code address phone")
      .populate("requesting_depot_id", "name code address phone")
      .populate("load_sheet_id", "load_sheet_number delivery_date vehicle_info")
      .populate("transport_id", "name vehicle_no driver_name driver_phone")
      .populate("created_by", "name email")
      .populate("delivered_by", "name email")
      .populate("received_by", "name email")
      .lean();

    if (!chalan) {
      return res.status(404).json({
        success: false,
        message: "Requisition chalan not found",
      });
    }

    // Optionally include all 4 copies
    let copies = null;
    if (include_copies === "true") {
      const masterChalanId = chalan.master_chalan_id || chalan._id;
      copies = await models.RequisitionChalan.find({
        $or: [{ _id: masterChalanId }, { master_chalan_id: masterChalanId }],
      })
        .select("_id chalan_no copy_number status")
        .sort({ copy_number: 1 })
        .lean();
    }

    res.json({
      success: true,
      data: {
        ...chalan,
        copies,
      },
    });
  } catch (error) {
    console.error("Error fetching requisition chalan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requisition chalan",
    });
  }
});

/**
 * POST /api/v1/inventory/req-chalans/:id/receive
 * Receive requisition chalan (by requesting depot)
 * Supports partial receiving
 */
router.post(
  "/:id/receive",
  authenticate,
  checkPermission("req-chalan:receive"),
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { facility_id, user_id } = req.user;
      const { items, damage_notes } = req.body; // items: [{ sku, qty_received_ctn, qty_received_pcs, damage_qty_ctn, damage_reason }]

      if (!items || items.length === 0) {
        throw new Error("No items provided for receiving");
      }

      const chalan = await models.RequisitionChalan.findById(id).session(session);

      if (!chalan) {
        throw new Error("Requisition chalan not found");
      }

      // Validate user is from requesting depot
      if (chalan.requesting_depot_id.toString() !== facility_id.toString()) {
        throw new Error("Only requesting depot can receive this chalan");
      }

      if (chalan.status === "Received") {
        throw new Error("Chalan already fully received");
      }

      if (chalan.status === "Cancelled") {
        throw new Error("Cannot receive cancelled chalan");
      }

      console.log(`\n=== RECEIVING REQUISITION CHALAN ===`);
      console.log(`Chalan: ${chalan.chalan_no}`);
      console.log(`Requesting Depot: ${facility_id}`);

      // Update received quantities
      let fullyReceived = true;

      for (const receivedItem of items) {
        const chalanItem = chalan.items.find((item) => item.sku === receivedItem.sku);
        if (!chalanItem) {
          throw new Error(`SKU ${receivedItem.sku} not found in chalan`);
        }

        const newReceivedQtyCtn =
          parseFloat(chalanItem.received_qty_ctn || 0) +
          parseFloat(receivedItem.qty_received_ctn || 0);
        const newReceivedQtyPcs =
          parseFloat(chalanItem.received_qty_pcs || 0) +
          parseFloat(receivedItem.qty_received_pcs || 0);

        // Validate not exceeding sent quantity
        if (newReceivedQtyCtn > parseFloat(chalanItem.qty_ctn)) {
          throw new Error(`Cannot receive more than sent quantity for ${receivedItem.sku}`);
        }

        chalanItem.received_qty_ctn = newReceivedQtyCtn;
        chalanItem.received_qty_pcs = newReceivedQtyPcs;

        // Track damages
        if (receivedItem.damage_qty_ctn || receivedItem.damage_reason) {
          chalanItem.damage_qty_ctn = parseFloat(receivedItem.damage_qty_ctn || 0);
          chalanItem.damage_reason = receivedItem.damage_reason || "";
        }

        // Check if fully received
        if (newReceivedQtyCtn < parseFloat(chalanItem.qty_ctn)) {
          fullyReceived = false;
        }

        // Update inventory in requesting depot
        const product = await models.Product.findOne({ sku: receivedItem.sku }).session(session);
        if (!product) {
          throw new Error(`Product ${receivedItem.sku} not found`);
        }

        await models.FactoryStoreInventory.findOneAndUpdate(
          {
            facility_id: facility_id,
            product_id: product._id,
          },
          {
            $inc: { qty_ctn: parseFloat(receivedItem.qty_received_ctn || 0) },
            $setOnInsert: {
              facility_id: facility_id,
              product_id: product._id,
            },
          },
          { upsert: true, session }
        );

        console.log(`  ✓ Received ${receivedItem.qty_received_ctn} CTN of ${receivedItem.sku}`);
      }

      // Update chalan status
      if (fullyReceived) {
        chalan.status = "Received";
        chalan.received_by = user_id;
        chalan.received_at = new Date();
        console.log(`  ✓ Chalan fully received`);
      } else {
        chalan.status = "Partially Received";
        console.log(`  ⏳ Chalan partially received`);
      }

      if (damage_notes) {
        chalan.damage_notes = damage_notes;
      }

      await chalan.save({ session });

      // Update all copies' status
      const masterChalanId = chalan.master_chalan_id || chalan._id;
      await models.RequisitionChalan.updateMany(
        {
          $or: [{ _id: masterChalanId }, { master_chalan_id: masterChalanId }],
          _id: { $ne: chalan._id }, // Exclude current chalan (already updated)
        },
        {
          $set: { status: chalan.status },
        },
        { session }
      );

      await session.commitTransaction();

      console.log(`✅ Receiving completed successfully`);

      res.json({
        success: true,
        message: fullyReceived ? "Chalan fully received" : "Chalan partially received",
        data: {
          chalan_id: chalan._id,
          chalan_no: chalan.chalan_no,
          status: chalan.status,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("❌ Error receiving requisition chalan:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to receive requisition chalan",
      });
    } finally {
      session.endSession();
    }
  }
);

/**
 * GET /api/v1/inventory/req-invoices
 * List requisition invoices with filters
 */
router.get("/invoices", authenticate, checkPermission("req-invoice:read"), async (req, res) => {
  try {
    const { facility_id } = req.user;
    const {
      status,
      requesting_depot_id,
      source_depot_id,
      from_date,
      to_date,
      page = 1,
      limit = 20,
      copy_number,
    } = req.query;

    const query = {
      $or: [{ source_depot_id: facility_id }, { requesting_depot_id: facility_id }],
    };

    if (status) {
      query.status = status;
    }

    if (requesting_depot_id) {
      query.requesting_depot_id = requesting_depot_id;
    }

    if (source_depot_id) {
      query.source_depot_id = source_depot_id;
    }

    if (from_date || to_date) {
      query.invoice_date = {};
      if (from_date) query.invoice_date.$gte = new Date(from_date);
      if (to_date) query.invoice_date.$lte = new Date(to_date);
    }

    // Filter by copy number (default show only copy 1)
    if (copy_number) {
      query.copy_number = parseInt(copy_number);
    } else {
      query.copy_number = 1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      models.RequisitionInvoice.find(query)
        .populate("source_depot_id", "name code")
        .populate("requesting_depot_id", "name code")
        .populate("load_sheet_id", "load_sheet_number")
        .populate("created_by", "name email")
        .sort({ invoice_date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.RequisitionInvoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching requisition invoices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requisition invoices",
    });
  }
});

/**
 * GET /api/v1/inventory/req-invoices/:id
 * Get single requisition invoice details
 */
router.get("/invoices/:id", authenticate, checkPermission("req-invoice:read"), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id } = req.user;
    const { include_copies } = req.query;

    const invoice = await models.RequisitionInvoice.findOne({
      _id: id,
      $or: [{ source_depot_id: facility_id }, { requesting_depot_id: facility_id }],
    })
      .populate("source_depot_id", "name code address phone")
      .populate("requesting_depot_id", "name code address phone")
      .populate("load_sheet_id", "load_sheet_number delivery_date")
      .populate("chalan_id", "chalan_no chalan_date")
      .populate("created_by", "name email")
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Requisition invoice not found",
      });
    }

    // Optionally include all 4 copies
    let copies = null;
    if (include_copies === "true") {
      const masterInvoiceId = invoice.master_invoice_id || invoice._id;
      copies = await models.RequisitionInvoice.find({
        $or: [{ _id: masterInvoiceId }, { master_invoice_id: masterInvoiceId }],
      })
        .select("_id invoice_no copy_number status payment_status")
        .sort({ copy_number: 1 })
        .lean();
    }

    res.json({
      success: true,
      data: {
        ...invoice,
        copies,
      },
    });
  } catch (error) {
    console.error("Error fetching requisition invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requisition invoice",
    });
  }
});

module.exports = router;
