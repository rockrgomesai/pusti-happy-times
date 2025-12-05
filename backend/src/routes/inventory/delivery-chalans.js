const express = require("express");
const router = express.Router();
const models = require("../../models");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

// GET /api/v1/inventory/delivery-chalans - List all chalans
router.get("/", authenticate, requireApiPermission("chalan:read"), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;
    console.log("📦 Chalan request - depot_id:", depot_id, "query:", req.query);
    const { status, distributor_id, from_date, to_date, page = 1, limit = 20 } = req.query;

    const query = { depot_id };

    if (status) query.status = status;
    if (distributor_id) query.distributor_id = distributor_id;
    if (from_date || to_date) {
      query.chalan_date = {};
      if (from_date) query.chalan_date.$gte = new Date(from_date);
      if (to_date) query.chalan_date.$lte = new Date(to_date);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [chalans, total] = await Promise.all([
      models.DeliveryChalan.find(query)
        .populate("distributor_id", "name address phone")
        .populate("transport_id", "transport")
        .populate("load_sheet_id", "load_sheet_number")
        .sort({ chalan_date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.DeliveryChalan.countDocuments(query),
    ]);

    // Convert Decimal128 to numbers for JSON serialization
    const convertDecimal = (value) => {
      if (!value) return value;
      if (value.$numberDecimal) return parseFloat(value.$numberDecimal);
      if (typeof value === 'object' && value.constructor && value.constructor.name === 'Decimal128') {
        return parseFloat(value.toString());
      }
      return value;
    };

    const processedChalans = chalans.map(chalan => ({
      ...chalan,
      total_qty_ctn: convertDecimal(chalan.total_qty_ctn),
      total_qty_pcs: convertDecimal(chalan.total_qty_pcs),
      items: chalan.items?.map(item => ({
        ...item,
        qty_ctn: convertDecimal(item.qty_ctn),
        qty_pcs: convertDecimal(item.qty_pcs),
      }))
    }));

    console.log("📦 Returning", processedChalans.length, "chalans, total:", total);
    
    res.json({
      success: true,
      data: processedChalans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching chalans:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chalans",
      error: error.message,
    });
  }
});

// GET /api/v1/inventory/delivery-chalans/:id - Get single chalan
router.get("/:id", authenticate, requireApiPermission("chalan:read"), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;
    const { id } = req.params;
    console.log("📦 GET single chalan - id:", id, "depot_id:", depot_id);

    const chalan = await models.DeliveryChalan.findOne({ _id: id, depot_id })
      .populate("distributor_id", "name address phone")
      .populate("transport_id", "transport")
      .populate("load_sheet_id", "load_sheet_number delivery_date")
      .populate("depot_id", "name address")
      .lean();

    console.log("📦 Found chalan:", chalan ? "YES" : "NO");

    if (!chalan) {
      return res.status(404).json({
        success: false,
        message: "Chalan not found",
      });
    }

    // Convert Decimal128 to numbers
    const convertDecimal = (value) => {
      if (!value) return value;
      if (value.$numberDecimal) return parseFloat(value.$numberDecimal);
      if (typeof value === 'object' && value.constructor && value.constructor.name === 'Decimal128') {
        return parseFloat(value.toString());
      }
      return value;
    };

    const processedChalan = {
      ...chalan,
      total_qty_ctn: convertDecimal(chalan.total_qty_ctn),
      total_qty_pcs: convertDecimal(chalan.total_qty_pcs),
      items: chalan.items?.map(item => ({
        ...item,
        qty_ctn: convertDecimal(item.qty_ctn),
        qty_pcs: convertDecimal(item.qty_pcs),
      }))
    };

    res.json({
      success: true,
      data: processedChalan,
    });
  } catch (error) {
    console.error("Error fetching chalan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chalan",
      error: error.message,
    });
  }
});

// PATCH /api/v1/inventory/delivery-chalans/:id/status - Update chalan status
router.patch("/:id/status", authenticate, requireApiPermission("chalan:edit"), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!["Generated", "Delivered", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const chalan = await models.DeliveryChalan.findOne({ _id: id, depot_id });

    if (!chalan) {
      return res.status(404).json({
        success: false,
        message: "Chalan not found",
      });
    }

    chalan.status = status;
    if (remarks) chalan.remarks = remarks;

    const updated = await chalan.save();

    // Re-fetch with lean to avoid virtual issues
    const result = await models.DeliveryChalan.findById(updated._id)
      .populate("distributor_id", "name address phone")
      .populate("transport_id", "transport")
      .populate("load_sheet_id", "load_sheet_number")
      .lean();

    res.json({
      success: true,
      message: "Chalan status updated",
      data: result,
    });
  } catch (error) {
    console.error("Error updating chalan status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update chalan status",
      error: error.message,
    });
  }
});

module.exports = router;
