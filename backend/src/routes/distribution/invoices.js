const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('../../models');
const { verifyToken, checkPermission } = require('../../middleware/auth');

// GET /api/distribution/invoices/list - Get Invoices list with filters
router.get('/invoices/list', verifyToken, checkPermission('invoice:read'), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;
    const {
      status,
      distributor_id,
      chalan_number,
      invoice_number,
      date_from,
      date_to,
      overdue_only,
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

    if (chalan_number) {
      query.chalan_number = new RegExp(chalan_number, 'i');
    }

    if (invoice_number) {
      query.invoice_number = new RegExp(invoice_number, 'i');
    }

    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) query.created_at.$gte = new Date(date_from);
      if (date_to) query.created_at.$lte = new Date(date_to);
    }

    if (overdue_only === 'true') {
      query.due_date = { $lt: new Date() };
      query.status = { $in: ['Unpaid', 'Partial'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      models.DeliveryInvoices.find(query)
        .populate('distributor_id', 'distributor_name distributor_code')
        .populate('chalan_id', 'chalan_number')
        .populate('created_by', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.DeliveryInvoices.countDocuments(query)
    ]);

    // Calculate aggregates for summary cards
    const aggregates = await models.DeliveryInvoices.aggregate([
      { $match: { depot_id: new mongoose.Types.ObjectId(depot_id) } },
      {
        $group: {
          _id: null,
          total_outstanding: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Unpaid', 'Partial']] },
                '$total_amount',
                0
              ]
            }
          },
          paid_today: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'Paid'] },
                    { $gte: ['$updated_at', new Date(new Date().setHours(0, 0, 0, 0))] }
                  ]
                },
                '$total_amount',
                0
              ]
            }
          },
          overdue_amount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['Unpaid', 'Partial']] },
                    { $lt: ['$due_date', new Date()] }
                  ]
                },
                '$total_amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const summary = aggregates.length > 0 ? {
      total_outstanding: parseFloat(aggregates[0].total_outstanding.toString()),
      paid_today: parseFloat(aggregates[0].paid_today.toString()),
      overdue_amount: parseFloat(aggregates[0].overdue_amount.toString())
    } : {
      total_outstanding: 0,
      paid_today: 0,
      overdue_amount: 0
    };

    res.json({
      success: true,
      data: {
        invoices,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching Invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Invoices',
      error: error.message
    });
  }
});

// GET /api/distribution/invoices/:id - Get Invoice details
router.get('/invoices/:id', verifyToken, checkPermission('invoice:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;

    const invoice = await models.DeliveryInvoices.findOne({ _id: id, depot_id })
      .populate('distributor_id', 'distributor_name distributor_code address phone_number tin_number')
      .populate('chalan_id', 'chalan_number delivery_date vehicle_no')
      .populate('load_sheet_id', 'load_sheet_number')
      .populate('created_by', 'name email')
      .populate('payment_history.recorded_by', 'name');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error fetching Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Invoice',
      error: error.message
    });
  }
});

// PATCH /api/distribution/invoices/:id/status - Update Invoice payment status
router.patch('/invoices/:id/status', verifyToken, checkPermission('invoice:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id, user_id } = req.userContext;
    const { status, payment_amount, payment_method, payment_reference } = req.body;

    if (!['Unpaid', 'Partial', 'Paid', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const invoice = await models.DeliveryInvoices.findOne({ _id: id, depot_id });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.status = status;

    if (payment_amount && (status === 'Partial' || status === 'Paid')) {
      invoice.payment_history.push({
        amount: payment_amount,
        payment_date: new Date(),
        payment_method: payment_method || 'Cash',
        reference: payment_reference || '',
        recorded_by: user_id
      });
    }

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice status updated successfully',
      data: invoice
    });

  } catch (error) {
    console.error('Error updating Invoice status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Invoice status',
      error: error.message
    });
  }
});

module.exports = router;
