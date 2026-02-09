/**
 * CSV Parser Utility
 * Handles CSV parsing for bulk uploads
 */

const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Parse CSV buffer to array of objects
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Promise<Array>} Array of parsed rows
 */
async function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    
    Readable.from(buffer.toString())
      .pipe(csv({
        skipEmptyLines: true,
        trim: true,
      }))
      .on('data', (data) => results.push(data))
      .on('error', (error) => errors.push(error))
      .on('end', () => {
        if (errors.length > 0) {
          reject(new Error(`CSV parsing failed: ${errors[0].message}`));
        } else {
          resolve(results);
        }
      });
  });
}

/**
 * Validate CSV headers against required schema
 * @param {Array} rows - Parsed CSV rows
 * @param {Array} requiredHeaders - Required column names
 * @returns {Object} { valid: boolean, missing: Array }
 */
function validateHeaders(rows, requiredHeaders) {
  if (!rows || rows.length === 0) {
    return { valid: false, missing: requiredHeaders };
  }
  
  const headers = Object.keys(rows[0]);
  const missing = requiredHeaders.filter(h => !headers.includes(h));
  
  return {
    valid: missing.length === 0,
    missing,
    headers
  };
}

module.exports = {
  parseCSV,
  validateHeaders
};
