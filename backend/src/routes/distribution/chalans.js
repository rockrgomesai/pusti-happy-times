const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('../../models');
const { verifyToken, checkPermission } = require('../../middleware/auth');
const {
  startTransactionSession,
  addSessionToQuery,
  getSaveOptions,
  getUpdateOptions,
  commitTransaction,
  abortTransaction,
  endSession
} = require('../../utils/transactionHelper');

// GET /api/distribution/chalans/list - Get Chalans list with filters
router.get('/chalans/list', verifyToken, checkPermission('chalan:read'), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;
    const {
      status,
      distributor_id,
      load_sheet_number,
      chalan_number,
      date_from,
      date_to,
      page = 1,
      limit = 20,
      sort = '-created_at'
    } = req.query;

    if (!depot_id) {
      return res.status(400).json({
        success: false,
        message: 'User facility not found'
      });
    }

    const query = { depot_id };

    if (status) {
      query.status = status;
    }

    if (distributor_id) {
      query.distributor_id = distributor_id;
    }

    if (load_sheet_number) {
      query.load_sheet_number = new RegExp(load_sheet_number, 'i');
    }

    if (chalan_number) {
      query.chalan_number = new RegExp(chalan_number, 'i');
    }

    if (date_from || date_to) {
      query.delivery_date = {};
      if (date_from) query.delivery_date.$gte = new Date(date_from);
      if (date_to) query.delivery_date.$lte = new Date(date_to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [chalans, total] = await Promise.all([
      models.DeliveryChalans.find(query)
        .populate('distributor_id', 'distributor_name distributor_code')
        .populate('load_sheet_id', 'load_sheet_number')
        .populate('created_by', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.DeliveryChalans.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        chalans,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching Chalans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Chalans',
      error: error.message
    });
  }
});

// GET /api/distribution/chalans/:id - Get Chalan details
router.get('/chalans/:id', verifyToken, checkPermission('chalan:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;

    const chalan = await models.DeliveryChalans.findOne({ _id: id, depot_id })
      .populate('distributor_id', 'distributor_name distributor_code address phone_number')
      .populate('load_sheet_id', 'load_sheet_number delivery_date')
      .populate('created_by', 'name email')
      .populate('status_history.changed_by', 'name');

    if (!chalan) {
      return res.status(404).json({
        success: false,
        message: 'Chalan not found'
      });
    }

    // Get related invoice
    const invoice = await models.DeliveryInvoices.findOne({ chalan_id: chalan._id })
      .select('invoice_number total_amount status');

    res.json({
      success: true,
      data: {
        chalan,
        invoice
      }
    });

  } catch (error) {
    console.error('Error fetching Chalan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Chalan',
      error: error.message
    });
  }
});

// PATCH /api/distribution/chalans/:id/status - Update Chalan status
router.patch('/chalans/:id/status', verifyToken, checkPermission('chalan:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id, user_id } = req.userContext;
    const { status } = req.body;

    if (!['Pending', 'InTransit', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const chalan = await models.DeliveryChalans.findOne({ _id: id, depot_id });

    if (!chalan) {
      return res.status(404).json({
        success: false,
        message: 'Chalan not found'
      });
    }

    chalan.status = status;
    chalan.status_history.push({
      status,
      changed_at: new Date(),
      changed_by: user_id
    });

    await chalan.save();

    res.json({
      success: true,
      message: 'Chalan status updated successfully',
      data: chalan
    });

  } catch (error) {
    console.error('Error updating Chalan status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Chalan status',
      error: error.message
    });
  }
});

// DELETE /api/distribution/chalans/:id - Cancel Chalan (Pending only, rollback inventory)
router.delete('/chalans/:id', verifyToken, checkPermission('chalan:delete'), async (req, res) => {
  let session;
  let useTransaction;
  
  try {
    // Start transaction (gracefully handles standalone MongoDB)
    ({ session, useTransaction } = await startTransactionSession());
    
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;

    const chalanQuery = models.DeliveryChalans.findOne({
      _id: id,
      depot_id,
      status: 'Pending'
    });
    const chalan = await addSessionToQuery(chalanQuery, session, useTransaction);

    if (!chalan) {
      await abortTransaction(session, useTransaction);
      return res.status(404).json({
        success: false,
        message: 'Chalan not found or cannot be cancelled'
      });
    }

    // Get Load Sheet
    const loadSheetQuery = models.LoadSheet.findById(chalan.load_sheet_id);
    const loadSheet = await addSessionToQuery(loadSheetQuery, session, useTransaction);

    if (!loadSheet) {
      await abortTransaction(session, useTransaction);
      return res.status(404).json({
        success: false,
        message: 'Associated Load Sheet not found'
      });
    }

    // Rollback stock for each item
    for (const item of chalan.items) {
      const productQuery = models.Product.findOne({ sku: item.sku }).select('_id');
      const product = await addSessionToQuery(productQuery, session, useTransaction);
      if (product) {
        await models.DepotStock.findOneAndUpdate(
          { depot_id, product_id: product._id },
          { $inc: { qty_ctn: parseFloat(item.qty_delivered) } },
          getUpdateOptions(session, useTransaction)
        );
      }
    }

    // Cancel related invoice
    await models.DeliveryInvoices.findOneAndUpdate(
      { chalan_id: chalan._id },
      { status: 'Cancelled' },
      getUpdateOptions(session, useTransaction)
    );

    // Remove from Load Sheet references
    await models.LoadSheet.findByIdAndUpdate(
      loadSheet._id,
      {
        $pull: {
          chalan_ids: chalan._id,
          invoice_ids: { $exists: true }
        }
      },
      getUpdateOptions(session, useTransaction)
    );

    // Cancel the chalan
    chalan.status = 'Cancelled';
    await chalan.save(getSaveOptions(session, useTransaction));

    await commitTransaction(session, useTransaction);

    res.json({
      success: true,
      message: 'Chalan cancelled and inventory restored'
    });

  } catch (error) {
    await abortTransaction(session, useTransaction);
    console.error('Error cancelling Chalan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel Chalan',
      error: error.message
    });
  } finally {
    endSession(session);
  }
});

module.exports = router;
