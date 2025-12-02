const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('../../models');
const { authenticate, requireApiPermission } = require('../../middleware/auth');
const {
  startTransactionSession,
  addSessionToQuery,
  getSaveOptions,
  getUpdateOptions,
  commitTransaction,
  abortTransaction,
  endSession
} = require('../../utils/transactionHelper');

// Helper function to format invoice particulars for ledger
const formatInvoiceParticulars = (items, doNumber, doDate, invoiceNumber, discount = 0) => {
  const lines = [`DO: ${doNumber} (${new Date(doDate).toLocaleDateString('en-GB')})\n`];
  
  items.forEach(item => {
    const qty = parseFloat(item.qty);
    const unitPrice = parseFloat(item.unit_price);
    const lineTotal = parseFloat(item.line_total);
    
    lines.push(`${item.sku} @ ${item.uom || 'PCS'}/${item.unit}, del: ${qty} (Price: ${lineTotal.toFixed(2)} @CtnPrice: ${unitPrice.toFixed(2)})`);
  });
  
  if (discount > 0) {
    lines.push(`\n(Discount: ${discount.toFixed(2)})`);
  }
  
  lines.push(`\nINV: ${invoiceNumber}`);
  
  return lines.join('\n');
};

// GET /api/distribution/load-sheets/approved-dos - Get approved DOs for Load Sheet creation
router.get('/load-sheets/approved-dos', authenticate, requireApiPermission('load-sheet:create'), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;

    if (!depot_id) {
      return res.status(400).json({
        success: false,
        message: 'User facility not found'
      });
    }

    // Get approved DOs for this depot
    const approvedDOs = await models.DemandOrder.find({
      facility_id: depot_id,
      status: { $in: ['Approved', 'Partially Delivered'] }
    })
    .populate('distributor_id', 'distributor_name distributor_code address phone_number')
    .populate('items.product_id', 'sku dp_price pack_size unit')
    .sort({ order_date: -1 });

    // Get delivered quantities from existing chalans
    const deliveredData = await models.DeliveryChalans.aggregate([
      {
        $match: {
          depot_id: new mongoose.Types.ObjectId(depot_id),
          status: { $ne: 'Cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            do_id: '$items.do_id',
            sku: '$items.sku'
          },
          total_delivered: { $sum: '$items.qty_delivered' }
        }
      }
    ]);

    // Create a map of delivered quantities
    const deliveredMap = {};
    deliveredData.forEach(item => {
      const key = `${item._id.do_id}_${item._id.sku}`;
      deliveredMap[key] = parseFloat(item.total_delivered.toString());
    });

    // Group DOs by distributor and calculate undelivered quantities
    const distributorMap = {};

    approvedDOs.forEach(doDoc => {
      const distributor = doDoc.distributor_id;
      if (!distributor) return;

      const distKey = distributor._id.toString();
      
      if (!distributorMap[distKey]) {
        distributorMap[distKey] = {
          distributor_id: distributor._id,
          distributor_name: distributor.distributor_name,
          distributor_code: distributor.distributor_code,
          distributor_address: distributor.address,
          distributor_phone: distributor.phone_number,
          dos: []
        };
      }

      const doItems = [];
      doDoc.items.forEach(item => {
        if (!item.product_id) return;

        const orderQty = parseFloat(item.quantity.toString());
        const deliveredKey = `${doDoc._id}_${item.product_id.sku}`;
        const previouslyDelivered = deliveredMap[deliveredKey] || 0;
        const undeliveredQty = orderQty - previouslyDelivered;

        if (undeliveredQty > 0) {
          doItems.push({
            do_id: doDoc._id,
            order_number: doDoc.order_number,
            order_date: doDoc.order_date,
            sku: item.product_id.sku,
            order_qty: orderQty,
            previously_delivered_qty: previouslyDelivered,
            undelivered_qty: undeliveredQty,
            delivery_qty: undeliveredQty, // Pre-fill with undelivered qty
            unit: 'CTN',
            uom: item.product_id.unit || 'PCS',
            unit_price: item.product_id.dp_price || 0,
            pack_size: item.product_id.pack_size || 1
          });
        }
      });

      if (doItems.length > 0) {
        distributorMap[distKey].dos.push({
          do_id: doDoc._id,
          order_number: doDoc.order_number,
          order_date: doDoc.order_date,
          items: doItems
        });
      }
    });

    // Convert map to array
    const distributors = Object.values(distributorMap).filter(dist => dist.dos.length > 0);

    res.json({
      success: true,
      data: distributors
    });

  } catch (error) {
    console.error('Error fetching approved DOs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved DOs',
      error: error.message
    });
  }
});

// POST /api/distribution/load-sheets/validate-stock - Validate stock for selected items
router.post('/load-sheets/validate-stock', authenticate, requireApiPermission('load-sheet:create'), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;
    const { items } = req.body; // Array of { sku, delivery_qty }

    if (!depot_id) {
      return res.status(400).json({
        success: false,
        message: 'User facility not found'
      });
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    // Group items by SKU and sum delivery quantities
    const skuMap = {};
    items.forEach(item => {
      if (!skuMap[item.sku]) {
        skuMap[item.sku] = 0;
      }
      skuMap[item.sku] += parseFloat(item.delivery_qty || 0);
    });

    const skus = Object.keys(skuMap);

    // Get products for these SKUs
    const products = await models.Product.find({ sku: { $in: skus } }).select('_id sku');
    const productMap = {};
    products.forEach(p => {
      productMap[p.sku] = p._id;
    });

    // Get depot stock
    const stocks = await models.DepotStock.find({
      depot_id,
      product_id: { $in: products.map(p => p._id) }
    }).populate('product_id', 'sku');

    const stockValidation = [];
    const errors = [];

    skus.forEach(sku => {
      const allocated = skuMap[sku];
      const stock = stocks.find(s => s.product_id.sku === sku);
      const available = stock ? parseFloat(stock.qty_ctn.toString()) : 0;
      const remaining = available - allocated;

      stockValidation.push({
        sku,
        available,
        allocated,
        remaining,
        has_stock: remaining >= 0
      });

      if (remaining < 0) {
        errors.push({
          sku,
          message: `Insufficient stock. Available: ${available} CTN, Requested: ${allocated} CTN`
        });
      }
    });

    res.json({
      success: errors.length === 0,
      data: {
        validation: stockValidation,
        has_errors: errors.length > 0,
        errors
      }
    });

  } catch (error) {
    console.error('Error validating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate stock',
      error: error.message
    });
  }
});

// POST /api/distribution/load-sheets/create - Create new Load Sheet
router.post('/load-sheets/create', authenticate, requireApiPermission('load-sheet:create'), async (req, res) => {
  try {
    const { facility_id: depot_id, user_id } = req.userContext;
    const { delivery_date, vehicle_info, distributors, notes, status = 'Draft' } = req.body;

    if (!depot_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'User context not found'
      });
    }

    // Validate required fields
    if (!delivery_date || !vehicle_info || !distributors || distributors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate stock if creating (not draft)
    if (status !== 'Draft') {
      const allItems = [];
      distributors.forEach(dist => {
        dist.do_items.forEach(item => {
          allItems.push({ sku: item.sku, delivery_qty: item.delivery_qty });
        });
      });

      // Call validate stock logic
      const skuMap = {};
      allItems.forEach(item => {
        if (!skuMap[item.sku]) skuMap[item.sku] = 0;
        skuMap[item.sku] += parseFloat(item.delivery_qty || 0);
      });

      const skus = Object.keys(skuMap);
      const products = await models.Product.find({ sku: { $in: skus } }).select('_id sku');
      const productMap = {};
      products.forEach(p => { productMap[p.sku] = p._id; });

      const stocks = await models.DepotStock.find({
        depot_id,
        product_id: { $in: products.map(p => p._id) }
      }).populate('product_id', 'sku');

      const errors = [];
      skus.forEach(sku => {
        const allocated = skuMap[sku];
        const stock = stocks.find(s => s.product_id.sku === sku);
        const available = stock ? parseFloat(stock.qty_ctn.toString()) : 0;
        if (available < allocated) {
          errors.push(`${sku}: Available ${available}, Requested ${allocated}`);
        }
      });

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
          errors
        });
      }
    }

    // Create Load Sheet
    const loadSheet = new models.LoadSheet({
      depot_id,
      created_by: user_id,
      delivery_date,
      vehicle_info,
      distributors,
      notes,
      status
    });

    await loadSheet.save();

    res.status(201).json({
      success: true,
      message: 'Load Sheet created successfully',
      data: loadSheet
    });

  } catch (error) {
    console.error('Error creating Load Sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Load Sheet',
      error: error.message
    });
  }
});

// GET /api/distribution/load-sheets/list - Get Load Sheets list with filters
router.get('/load-sheets/list', authenticate, requireApiPermission('load-sheet:read'), async (req, res) => {
  try {
    const { facility_id: depot_id } = req.userContext;
    const {
      status,
      distributor_id,
      date_from,
      date_to,
      search,
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
      query['distributors.distributor_id'] = distributor_id;
    }

    if (date_from || date_to) {
      query.delivery_date = {};
      if (date_from) query.delivery_date.$gte = new Date(date_from);
      if (date_to) query.delivery_date.$lte = new Date(date_to);
    }

    if (search) {
      query.load_sheet_number = new RegExp(search, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [loadSheets, total] = await Promise.all([
      models.LoadSheet.find(query)
        .populate('created_by', 'name')
        .populate('distributors.distributor_id', 'distributor_name distributor_code')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.LoadSheet.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        load_sheets: loadSheets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching Load Sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Load Sheets',
      error: error.message
    });
  }
});

// GET /api/distribution/load-sheets/:id - Get Load Sheet details
router.get('/load-sheets/:id', authenticate, requireApiPermission('load-sheet:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;

    const loadSheet = await models.LoadSheet.findOne({ _id: id, depot_id })
      .populate('created_by', 'name email')
      .populate('converted_by', 'name email')
      .populate('distributors.distributor_id', 'distributor_name distributor_code address phone_number')
      .populate('chalan_ids')
      .populate('invoice_ids');

    if (!loadSheet) {
      return res.status(404).json({
        success: false,
        message: 'Load Sheet not found'
      });
    }

    res.json({
      success: true,
      data: loadSheet
    });

  } catch (error) {
    console.error('Error fetching Load Sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Load Sheet',
      error: error.message
    });
  }
});

// PATCH /api/distribution/load-sheets/:id - Update Load Sheet (Draft only)
router.patch('/load-sheets/:id', authenticate, requireApiPermission('load-sheet:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;
    const updates = req.body;

    const loadSheet = await models.LoadSheet.findOne({ _id: id, depot_id, status: 'Draft' });

    if (!loadSheet) {
      return res.status(404).json({
        success: false,
        message: 'Load Sheet not found or cannot be edited'
      });
    }

    // Update allowed fields
    if (updates.delivery_date) loadSheet.delivery_date = updates.delivery_date;
    if (updates.vehicle_info) loadSheet.vehicle_info = updates.vehicle_info;
    if (updates.distributors) loadSheet.distributors = updates.distributors;
    if (updates.notes !== undefined) loadSheet.notes = updates.notes;
    if (updates.status && ['Draft', 'Validated'].includes(updates.status)) {
      loadSheet.status = updates.status;
    }

    await loadSheet.save();

    res.json({
      success: true,
      message: 'Load Sheet updated successfully',
      data: loadSheet
    });

  } catch (error) {
    console.error('Error updating Load Sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Load Sheet',
      error: error.message
    });
  }
});

// POST /api/distribution/load-sheets/:id/convert - Convert Load Sheet to Chalans & Invoices
router.post('/load-sheets/:id/convert', authenticate, requireApiPermission('load-sheet:convert'), async (req, res) => {
  let session;
  let useTransaction;
  
  try {
    // Start transaction (gracefully handles standalone MongoDB)
    ({ session, useTransaction } = await startTransactionSession());
    
    const { id } = req.params;
    const { facility_id: depot_id, user_id } = req.userContext;

    const loadSheetQuery = models.LoadSheet.findOne({
      _id: id,
      depot_id,
      status: { $in: ['Validated', 'Loaded'] }
    });
    const loadSheet = await addSessionToQuery(loadSheetQuery, session, useTransaction);

    if (!loadSheet) {
      await abortTransaction(session, useTransaction);
      return res.status(404).json({
        success: false,
        message: 'Load Sheet not found or cannot be converted'
      });
    }

    // Re-validate stock
    const skuMap = {};
    loadSheet.distributors.forEach(dist => {
      dist.do_items.forEach(item => {
        if (!skuMap[item.sku]) skuMap[item.sku] = 0;
        skuMap[item.sku] += parseFloat(item.delivery_qty);
      });
    });

    const skus = Object.keys(skuMap);
    const productsQuery = models.Product.find({ sku: { $in: skus } }).select('_id sku');
    const products = await addSessionToQuery(productsQuery, session, useTransaction);
    const productMap = {};
    products.forEach(p => { productMap[p.sku] = p._id; });

    const stocksQuery = models.DepotStock.find({
      depot_id,
      product_id: { $in: products.map(p => p._id) }
    }).populate('product_id', 'sku');
    const stocks = await addSessionToQuery(stocksQuery, session, useTransaction);

    const stockErrors = [];
    skus.forEach(sku => {
      const allocated = skuMap[sku];
      const stock = stocks.find(s => s.product_id.sku === sku);
      const available = stock ? parseFloat(stock.qty_ctn.toString()) : 0;
      if (available < allocated) {
        stockErrors.push(`${sku}: Available ${available}, Requested ${allocated}`);
      }
    });

    if (stockErrors.length > 0) {
      await abortTransaction(session, useTransaction);
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
        errors: stockErrors
      });
    }

    const createdChalans = [];
    const createdInvoices = [];
    const createdLedgerEntries = [];

    // Process each distributor
    for (const distData of loadSheet.distributors) {
      const distributorQuery = models.Distributor.findById(distData.distributor_id);
      const distributor = await addSessionToQuery(distributorQuery, session, useTransaction);
      
      if (!distributor) continue;

      // Group items by DO
      const doGroups = {};
      distData.do_items.forEach(item => {
        const doId = item.do_id.toString();
        if (!doGroups[doId]) {
          doGroups[doId] = {
            order_number: item.order_number,
            order_date: item.order_date,
            items: []
          };
        }
        doGroups[doId].items.push(item);
      });

      // Create Chalan items
      const chalanItems = distData.do_items.map(item => ({
        do_id: item.do_id,
        order_number: item.order_number,
        sku: item.sku,
        qty_delivered: item.delivery_qty,
        unit: item.unit || 'CTN',
        uom: item.uom || 'PCS'
      }));

      // Create Chalan
      const chalan = new models.DeliveryChalans({
        load_sheet_id: loadSheet._id,
        load_sheet_number: loadSheet.load_sheet_number,
        distributor_id: distributor._id,
        distributor_name: distributor.distributor_name,
        distributor_code: distributor.distributor_code,
        distributor_address: distributor.address,
        distributor_phone: distributor.phone_number,
        items: chalanItems,
        delivery_date: loadSheet.delivery_date,
        vehicle_no: loadSheet.vehicle_info.vehicle_no,
        driver_name: loadSheet.vehicle_info.driver_name,
        driver_phone: loadSheet.vehicle_info.driver_phone,
        depot_id,
        created_by: user_id,
        status: 'Pending'
      });

      await chalan.save(getSaveOptions(session, useTransaction));
      createdChalans.push(chalan);

      // Create Invoice items with pricing
      const invoiceItems = [];
      let totalAmount = 0;

      for (const item of distData.do_items) {
        const product = await models.Product.findOne({ sku: item.sku }).select('dp_price').session(session);
        const unitPrice = product ? parseFloat(product.dp_price || 0) : 0;
        const qty = parseFloat(item.delivery_qty);
        const lineTotal = qty * unitPrice;

        invoiceItems.push({
          do_id: item.do_id,
          order_number: item.order_number,
          sku: item.sku,
          qty: item.delivery_qty,
          unit: item.unit || 'CTN',
          unit_price: unitPrice,
          line_total: lineTotal
        });

        totalAmount += lineTotal;
      }

      // Create Invoice
      const invoice = new models.DeliveryInvoices({
        chalan_id: chalan._id,
        chalan_number: chalan.chalan_number,
        load_sheet_id: loadSheet._id,
        distributor_id: distributor._id,
        distributor_name: distributor.distributor_name,
        distributor_code: distributor.distributor_code,
        distributor_address: distributor.address,
        distributor_phone: distributor.phone_number,
        distributor_tin: distributor.tin_number,
        items: invoiceItems,
        total_amount: totalAmount,
        payment_terms: distributor.payment_terms || 'Net 30',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        depot_id,
        created_by: user_id,
        status: 'Unpaid'
      });

      await invoice.save(getSaveOptions(session, useTransaction));
      createdInvoices.push(invoice);

      // Create ledger entries per DO
      for (const [doId, doGroup] of Object.entries(doGroups)) {
        const doItems = invoiceItems.filter(item => item.do_id.toString() === doId);
        const doTotal = doItems.reduce((sum, item) => sum + parseFloat(item.line_total), 0);

        const particulars = formatInvoiceParticulars(
          doItems,
          doGroup.order_number,
          doGroup.order_date,
          invoice.invoice_number,
          0 // No discount for now
        );

        const ledgerEntry = new models.Collection({
          distributor_id: distributor._id,
          transaction_type: 'Invoice',
          reference_type: 'DeliveryInvoice',
          reference_id: invoice._id,
          reference_number: invoice.invoice_number,
          do_number: doGroup.order_number,
          transaction_date: new Date(),
          debit_amount: doTotal,
          credit_amount: 0,
          particulars,
          created_by: user_id
        });

        await ledgerEntry.save(getSaveOptions(session, useTransaction));
        createdLedgerEntries.push(ledgerEntry);

        // Update DO with delivery info
        await models.DemandOrder.findByIdAndUpdate(
          doId,
          {
            $push: {
              delivered_items: doItems.map(item => ({
                chalan_id: chalan._id,
                chalan_number: chalan.chalan_number,
                invoice_id: invoice._id,
                invoice_number: invoice.invoice_number,
                delivery_date: loadSheet.delivery_date,
                sku: item.sku,
                qty_delivered: item.qty
              }))
            }
          },
          getUpdateOptions(session, useTransaction)
        );
      }

      // Deduct stock
      for (const item of distData.do_items) {
        const product = products.find(p => p.sku === item.sku);
        if (product) {
          await models.DepotStock.findOneAndUpdate(
            { depot_id, product_id: product._id },
            { $inc: { qty_ctn: -parseFloat(item.delivery_qty) } },
            getUpdateOptions(session, useTransaction)
          );
        }
      }
    }

    // Update Load Sheet
    loadSheet.status = 'Converted';
    loadSheet.converted_at = new Date();
    loadSheet.converted_by = user_id;
    loadSheet.chalan_ids = createdChalans.map(c => c._id);
    loadSheet.invoice_ids = createdInvoices.map(i => i._id);
    await loadSheet.save(getSaveOptions(session, useTransaction));

    await commitTransaction(session, useTransaction);

    res.json({
      success: true,
      message: 'Load Sheet converted successfully',
      data: {
        load_sheet: loadSheet,
        chalans: createdChalans,
        invoices: createdInvoices,
        ledger_entries: createdLedgerEntries
      }
    });

  } catch (error) {
    await abortTransaction(session, useTransaction);
    console.error('Error converting Load Sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert Load Sheet',
      error: error.message
    });
  } finally {
    endSession(session);
  }
});

// DELETE /api/distribution/load-sheets/:id - Delete Load Sheet (Draft only)
router.delete('/load-sheets/:id', authenticate, requireApiPermission('load-sheet:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const { facility_id: depot_id } = req.userContext;

    const result = await models.LoadSheet.findOneAndDelete({
      _id: id,
      depot_id,
      status: 'Draft'
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Load Sheet not found or cannot be deleted'
      });
    }

    res.json({
      success: true,
      message: 'Load Sheet deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting Load Sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Load Sheet',
      error: error.message
    });
  }
});

module.exports = router;
