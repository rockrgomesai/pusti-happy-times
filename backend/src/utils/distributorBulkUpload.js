/**
 * Distributor Bulk Upload Service
 * Handles CSV validation, lookup, and bulk creation
 */

const mongoose = require('mongoose');
const Distributor = require('../models/Distributor');
const Territory = require('../models/Territory');
const Facility = require('../models/Facility');
const Product = require('../models/Product');

const REQUIRED_COLUMNS = [
  'name',
  'db_point_name',
  'product_segments',
  'distributor_type',
  'delivery_depot_name',
  'unit'
];

const OPTIONAL_COLUMNS = [
  'erp_id',
  'mobile',
  'credit_limit',
  'bank_guarantee',
  'proprietor',
  'proprietor_dob',
  'registration_date',
  'computer',
  'printer',
  'emergency_contact',
  'emergency_relation',
  'emergency_mobile',
  'latitude',
  'longitude',
  'address',
  'note'
];

const PRODUCT_SEGMENTS = ['BIS', 'BEV'];
const DISTRIBUTOR_TYPES = [
  'Commission Distributor',
  'General Distributor',
  'Special Distributor',
  'Spot Distributor',
  'Super Distributor'
];
const UNITS = ['CTN', 'PCS'];
const BINARY_CHOICES = ['Yes', 'No'];

/**
 * Lookup Territory by name and type
 */
async function lookupTerritory(name, type = 'db_point') {
  const territory = await Territory.findOne({ 
    name: name.trim(), 
    type,
    active: true 
  }).lean();
  
  return territory;
}

/**
 * Lookup Facility by name
 */
async function lookupFacility(name) {
  const facility = await Facility.findOne({ 
    name: name.trim(),
    active: true 
  }).lean();
  
  return facility;
}

/**
 * Validate and transform a single row
 */
async function validateRow(row, rowNumber, userId) {
  const errors = [];
  const warnings = [];
  
  // Check required fields
  for (const col of REQUIRED_COLUMNS) {
    if (!row[col] || row[col].trim() === '') {
      errors.push(`Missing required field: ${col}`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  
  // Validate name uniqueness
  const existingDistributor = await Distributor.findOne({ 
    name: row.name.trim() 
  }).lean();
  
  if (existingDistributor) {
    errors.push(`Distributor name "${row.name}" already exists`);
  }
  
  // Lookup db_point
  const dbPoint = await lookupTerritory(row.db_point_name, 'db_point');
  if (!dbPoint) {
    errors.push(`DB Point "${row.db_point_name}" not found`);
  }
  
  // Lookup facility
  const facility = await lookupFacility(row.delivery_depot_name);
  if (!facility) {
    errors.push(`Delivery depot "${row.delivery_depot_name}" not found`);
  }
  
  // Validate product_segments
  const segments = row.product_segments
    .split(',')
    .map(s => s.trim())
    .filter(s => s);
  
  const invalidSegments = segments.filter(s => !PRODUCT_SEGMENTS.includes(s));
  if (invalidSegments.length > 0) {
    errors.push(`Invalid product segments: ${invalidSegments.join(', ')}. Must be BIS or BEV`);
  }
  
  if (segments.length === 0) {
    errors.push('At least one product segment is required');
  }
  
  // Validate distributor_type
  if (!DISTRIBUTOR_TYPES.includes(row.distributor_type.trim())) {
    errors.push(`Invalid distributor type: "${row.distributor_type}". Must be one of: ${DISTRIBUTOR_TYPES.join(', ')}`);
  }
  
  // Validate unit
  if (!UNITS.includes(row.unit.trim())) {
    errors.push(`Invalid unit: "${row.unit}". Must be CTN or PCS`);
  }
  
  // Validate optional fields
  if (row.computer && row.computer.trim() && !BINARY_CHOICES.includes(row.computer.trim())) {
    errors.push(`Invalid computer value: "${row.computer}". Must be Yes or No`);
  }
  
  if (row.printer && row.printer.trim() && !BINARY_CHOICES.includes(row.printer.trim())) {
    errors.push(`Invalid printer value: "${row.printer}". Must be Yes or No`);
  }
  
  // Validate mobile format (if provided)
  if (row.mobile && row.mobile.trim()) {
    const numbers = row.mobile.split(/[,\s]+/).filter(n => n.trim());
    for (const num of numbers) {
      const trimmed = num.trim();
      if (!/^(\+?88\s?)?01[3-9]\d{8}$/.test(trimmed)) {
        errors.push(`Invalid mobile number format: "${num}". Use +8801XXXXXXXXX or 01XXXXXXXXX`);
      }
    }
  }
  
  // Validate decimals
  if (row.credit_limit && row.credit_limit.trim()) {
    const credit = parseFloat(row.credit_limit);
    if (isNaN(credit) || credit < 0) {
      errors.push(`Invalid credit_limit: "${row.credit_limit}". Must be a non-negative number`);
    }
  }
  
  if (row.bank_guarantee && row.bank_guarantee.trim()) {
    const guarantee = parseFloat(row.bank_guarantee);
    if (isNaN(guarantee) || guarantee < 0) {
      errors.push(`Invalid bank_guarantee: "${row.bank_guarantee}". Must be a non-negative number`);
    }
  }
  
  // Validate dates
  if (row.proprietor_dob && row.proprietor_dob.trim()) {
    const dob = new Date(row.proprietor_dob);
    if (isNaN(dob.getTime())) {
      errors.push(`Invalid proprietor_dob: "${row.proprietor_dob}". Use YYYY-MM-DD format`);
    }
  }
  
  if (row.registration_date && row.registration_date.trim()) {
    const regDate = new Date(row.registration_date);
    if (isNaN(regDate.getTime())) {
      errors.push(`Invalid registration_date: "${row.registration_date}". Use YYYY-MM-DD format`);
    }
  }
  
  // Validate erp_id uniqueness (if provided)
  if (row.erp_id && row.erp_id.trim()) {
    const erpId = parseInt(row.erp_id);
    if (isNaN(erpId)) {
      errors.push(`Invalid erp_id: "${row.erp_id}". Must be a number`);
    } else {
      const existingErp = await Distributor.findOne({ erp_id: erpId }).lean();
      if (existingErp) {
        errors.push(`ERP ID ${erpId} already exists`);
      }
    }
  }
  
  // Validate mobile uniqueness (if provided)
  if (row.mobile && row.mobile.trim()) {
    // Check first number for uniqueness
    const firstNumber = row.mobile.split(/[,\s]+/)[0].trim();
    const existingMobile = await Distributor.findOne({ mobile: new RegExp(firstNumber, 'i') }).lean();
    if (existingMobile) {
      warnings.push(`Mobile number ${firstNumber} may already be in use`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  
  // Build distributor payload
  const payload = {
    name: row.name.trim(),
    db_point_id: dbPoint._id,
    product_segment: segments,
    distributor_type: row.distributor_type.trim(),
    delivery_depot_id: facility._id,
    unit: row.unit.trim(),
    created_by: userId,
    updated_by: userId
  };
  
  // Add optional fields
  if (row.erp_id && row.erp_id.trim()) {
    payload.erp_id = parseInt(row.erp_id);
  }
  
  if (row.mobile && row.mobile.trim()) {
    payload.mobile = row.mobile.trim();
  }
  
  if (row.credit_limit && row.credit_limit.trim()) {
    payload.credit_limit = mongoose.Types.Decimal128.fromString(parseFloat(row.credit_limit).toFixed(2));
  }
  
  if (row.bank_guarantee && row.bank_guarantee.trim()) {
    payload.bank_guarantee = mongoose.Types.Decimal128.fromString(parseFloat(row.bank_guarantee).toFixed(2));
  }
  
  if (row.proprietor && row.proprietor.trim()) {
    payload.proprietor = row.proprietor.trim();
  }
  
  if (row.proprietor_dob && row.proprietor_dob.trim()) {
    payload.proprietor_dob = new Date(row.proprietor_dob);
  }
  
  if (row.registration_date && row.registration_date.trim()) {
    payload.registration_date = new Date(row.registration_date);
  }
  
  if (row.computer && row.computer.trim()) {
    payload.computer = row.computer.trim();
  }
  
  if (row.printer && row.printer.trim()) {
    payload.printer = row.printer.trim();
  }
  
  if (row.emergency_contact && row.emergency_contact.trim()) {
    payload.emergency_contact = row.emergency_contact.trim();
  }
  
  if (row.emergency_relation && row.emergency_relation.trim()) {
    payload.emergency_relation = row.emergency_relation.trim();
  }
  
  if (row.emergency_mobile && row.emergency_mobile.trim()) {
    payload.emergency_mobile = row.emergency_mobile.trim();
  }
  
  if (row.latitude && row.latitude.trim()) {
    payload.latitude = row.latitude.trim();
  }
  
  if (row.longitude && row.longitude.trim()) {
    payload.longitude = row.longitude.trim();
  }
  
  if (row.address && row.address.trim()) {
    payload.address = row.address.trim();
  }
  
  if (row.note && row.note.trim()) {
    payload.note = row.note.trim();
  }
  
  return {
    valid: true,
    errors: [],
    warnings,
    payload
  };
}

/**
 * Process bulk upload
 */
async function processBulkUpload(rows, userId) {
  const results = {
    total: rows.length,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
    created: []
  };
  
  // Validate all rows first
  const validations = [];
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +2 for header row and 0-index
    const validation = await validateRow(rows[i], rowNumber, userId);
    validations.push({ rowNumber, row: rows[i], ...validation });
  }
  
  // Check if any errors
  const hasErrors = validations.some(v => !v.valid);
  
  if (hasErrors) {
    // Return all errors without creating any distributors
    results.errors = validations
      .filter(v => !v.valid)
      .map(v => ({
        row: v.rowNumber,
        name: v.row.name,
        errors: v.errors
      }));
    
    results.failed = results.errors.length;
    
    return results;
  }
  
  // All validations passed, create distributors in a transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    for (const validation of validations) {
      try {
        const distributor = await Distributor.create([validation.payload], { session });
        results.created.push({
          row: validation.rowNumber,
          name: distributor[0].name,
          _id: distributor[0]._id
        });
        results.successful++;
      } catch (error) {
        results.errors.push({
          row: validation.rowNumber,
          name: validation.row.name,
          errors: [error.message]
        });
        results.failed++;
      }
      results.processed++;
    }
    
    // Commit if all successful
    if (results.failed === 0) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
      results.created = [];
      results.successful = 0;
    }
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
  
  return results;
}

module.exports = {
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  validateRow,
  processBulkUpload,
  lookupTerritory,
  lookupFacility
};
