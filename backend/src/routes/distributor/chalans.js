const express = require("express");
const router = express.Router();
const models = require("../../models");
const { authenticate, requireApiPermission } = require("../../middleware/auth");
const mongoose = require("mongoose");

// GET /api/v1/distributor/chalans - List chalans for distributor
router.get("/", authenticate, requireApiPermission("distributor-chalan:read"), async (req, res) => {
  try {
    let distributorId = req.userContext?.distributor_id;

    // If not in context, try to get from user object (fallback for old tokens)
    if (!distributorId && req.user?.distributor_id) {
      distributorId = req.user.distributor_id._id || req.user.distributor_id;
    }

    if (!distributorId) {
      return res.status(400).json({
        success: false,
        message: "You are not associated with any distributor. Please contact your administrator.",
        debug: {
          userContext: req.userContext,
          userDistributorId: req.user?.distributor_id,
        },
      });
    }

    const { status, from_date, to_date, search, page = 1, limit = 20 } = req.query;

    const query = { distributor_id: distributorId };

    if (status) {
      query.status = status;
    }

    if (from_date || to_date) {
      query.chalan_date = {};
      if (from_date) query.chalan_date.$gte = new Date(from_date);
      if (to_date) query.chalan_date.$lte = new Date(to_date);
    }

    if (search) {
      query.chalan_no = new RegExp(search, "i");
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [chalans, total] = await Promise.all([
      models.DeliveryChalan.find(query)
        .populate("depot_id", "name address")
        .populate("transport_id", "transport")
        .populate("load_sheet_id", "load_sheet_number")
        .sort({ chalan_date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.DeliveryChalan.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: chalans,
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

// GET /api/v1/distributor/chalans/:id - Get single chalan details
router.get(
  "/:id",
  authenticate,
  requireApiPermission("distributor-chalan:read"),
  async (req, res) => {
    try {
      const { id } = req.params;

      let distributorId = req.userContext?.distributor_id;

      // If not in context, try to get from user object
      if (!distributorId && req.user?.distributor_id) {
        distributorId = req.user.distributor_id._id || req.user.distributor_id;
      }

      if (!distributorId) {
        return res.status(400).json({
          success: false,
          message:
            "You are not associated with any distributor. Please contact your administrator.",
        });
      }

      const chalan = await models.DeliveryChalan.findOne({
        _id: id,
        distributor_id: distributorId,
      })
        .populate("depot_id", "name address")
        .populate("transport_id", "transport")
        .populate("load_sheet_id", "load_sheet_number delivery_date")
        .populate("received_by", "username")
        .lean();

      if (!chalan) {
        return res.status(404).json({
          success: false,
          message: "Chalan not found",
        });
      }

      res.json({
        success: true,
        data: chalan,
      });
    } catch (error) {
      console.error("Error fetching chalan:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chalan",
        error: error.message,
      });
    }
  }
);

// POST /api/v1/distributor/chalans/:id/receive - Receive chalan with quantities
router.post(
  "/:id/receive",
  authenticate,
  requireApiPermission("distributor-chalan:receive"),
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let distributorId = req.userContext?.distributor_id;
      const user_id = req.userContext?.user_id || req.user?._id;

      // If not in context, try to get from user object
      if (!distributorId && req.user?.distributor_id) {
        distributorId = req.user.distributor_id._id || req.user.distributor_id;
      }

      if (!distributorId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message:
            "You are not associated with any distributor. Please contact your administrator.",
        });
      }
      const { id } = req.params;
      const { items: receivedItems, notes } = req.body;

      // Find chalan
      const chalan = await models.DeliveryChalan.findOne({
        _id: id,
        distributor_id: distributorId,
      }).session(session);

      if (!chalan) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Chalan not found",
        });
      }

      if (chalan.status === "Received") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Chalan has already been received",
        });
      }

      // Validate and update items
      let hasPartialReceipt = false;
      let allFullyReceived = true;
      let totalDamageAmount = 0;
      const damageDetails = [];

      for (const receivedItem of receivedItems) {
        const chalanItem = chalan.items.find((item) => item.sku === receivedItem.sku);

        if (!chalanItem) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `SKU ${receivedItem.sku} not found in chalan`,
          });
        }

        const originalQty = parseFloat(chalanItem.qty_ctn.toString());
        const receivedQty = parseFloat(receivedItem.received_qty_ctn || 0);
        const damageQty = parseFloat(receivedItem.damage_qty_ctn || 0);

        // Validate quantities
        if (receivedQty + damageQty > originalQty) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Total received + damage quantity exceeds original quantity for SKU ${receivedItem.sku}`,
          });
        }

        if (receivedQty < originalQty) {
          hasPartialReceipt = true;
        }

        if (receivedQty + damageQty < originalQty) {
          allFullyReceived = false;
        }

        // Update chalan item
        chalanItem.received_qty_ctn = receivedQty;
        chalanItem.received_qty_pcs = receivedItem.received_qty_pcs || 0;
        chalanItem.damage_qty_ctn = damageQty;
        chalanItem.damage_qty_pcs = receivedItem.damage_qty_pcs || 0;
        chalanItem.damage_reason = receivedItem.damage_reason || "";

        // Update distributor stock (upsert)
        await models.DistributorStock.findOneAndUpdate(
          { distributor_id: distributorId, sku: receivedItem.sku },
          {
            $inc: { qty: receivedQty },
            $set: {
              last_received_at: new Date(),
              last_chalan_id: chalan._id,
            },
          },
          { upsert: true, session }
        );

        // Calculate damage amount for ledger adjustment
        if (damageQty > 0) {
          const product = await models.Product.findOne({ sku: receivedItem.sku })
            .select("dp_price")
            .session(session);
          const unitPrice = product ? parseFloat(product.dp_price || 0) : 0;
          const damageAmount = damageQty * unitPrice;
          totalDamageAmount += damageAmount;

          damageDetails.push({
            sku: receivedItem.sku,
            qty: damageQty,
            uom: chalanItem.uom,
            reason: receivedItem.damage_reason || "Not specified",
            amount: damageAmount,
          });
        }

        // Update DemandOrder delivery tracking
        if (receivedQty > 0 && chalanItem.do_number) {
          const demandOrder = await models.DemandOrder.findOne({
            order_number: chalanItem.do_number,
          }).session(session);

          if (demandOrder) {
            // Find matching item in DO
            const doItem = demandOrder.items.find((item) => item.sku === receivedItem.sku);

            if (doItem) {
              // Update delivered quantities
              const currentDelivered = parseFloat(doItem.delivered_qty?.toString() || 0);
              doItem.delivered_qty = currentDelivered + receivedQty;

              const orderQty = parseFloat(doItem.order_qty?.toString() || 0);
              doItem.undelivered_qty = orderQty - parseFloat(doItem.delivered_qty.toString());
            }

            // Check if all items are fully delivered
            const allDelivered = demandOrder.items.every((item) => {
              const orderQty = parseFloat(item.order_qty?.toString() || 0);
              const deliveredQty = parseFloat(item.delivered_qty?.toString() || 0);
              return deliveredQty >= orderQty;
            });

            const partiallyDelivered = demandOrder.items.some((item) => {
              const deliveredQty = parseFloat(item.delivered_qty?.toString() || 0);
              return deliveredQty > 0;
            });

            // Update DO status
            if (allDelivered) {
              demandOrder.status = "Delivered";
            } else if (partiallyDelivered) {
              demandOrder.status = "Partially Delivered";
            }

            await demandOrder.save({ session });
          }
        }
      }

      // Update chalan status
      if (allFullyReceived) {
        chalan.status = "Received";
      } else if (hasPartialReceipt) {
        chalan.status = "Partially Received";
      }

      chalan.received_at = new Date();
      chalan.received_by = user_id;
      chalan.damage_notes = notes || "";

      await chalan.save({ session });

      // Create CustomerLedger adjustment for damages
      if (totalDamageAmount > 0) {
        const CustomerLedger = require("../../models/CustomerLedger");

        // Format damage particulars
        const damageLines = damageDetails.map(
          (d) => `${d.sku}: ${d.qty} ${d.uom} (Reason: ${d.reason})`
        );
        const particulars = `Damage Adjustment - Chalan: ${chalan.chalan_no}\n${damageLines.join("\n")}`;

        await CustomerLedger.create(
          [
            {
              distributor_id: distributorId,
              particulars,
              transaction_date: new Date(),
              voucher_type: "DmgAdj",
              voucher_no: `${chalan.chalan_no}-DMG`,
              debit: 0,
              credit: totalDamageAmount,
              note: notes || "Damage adjustment for received chalan",
              created_by: user_id,
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();

      // Fetch updated chalan
      const updatedChalan = await models.DeliveryChalan.findById(id)
        .populate("depot_id", "name address")
        .populate("transport_id", "transport")
        .populate("load_sheet_id", "load_sheet_number")
        .lean();

      res.json({
        success: true,
        message: "Chalan received successfully",
        data: {
          chalan: updatedChalan,
          damage_adjustment:
            totalDamageAmount > 0
              ? {
                  amount: totalDamageAmount,
                  details: damageDetails,
                }
              : null,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Error receiving chalan:", error);
      res.status(500).json({
        success: false,
        message: "Failed to receive chalan",
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  }
);

module.exports = router;
