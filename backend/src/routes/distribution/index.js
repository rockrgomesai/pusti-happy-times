const express = require('express');
const router = express.Router();

// Import sub-routes
const loadSheetsRouter = require('./load-sheets');
const chalansRouter = require('./chalans');
const invoicesRouter = require('./invoices');

// Mount sub-routes
router.use('/', loadSheetsRouter);
router.use('/', chalansRouter);
router.use('/', invoicesRouter);

module.exports = router;
