/**
 * MongoDB Transaction Helper
 *
 * Handles MongoDB transactions gracefully for both replica set and standalone installations.
 * Standalone MongoDB instances don't support transactions, so this helper provides
 * a fallback mechanism.
 */

const mongoose = require("mongoose");

/**
 * Start a transaction session (if available)
 * @returns {Promise<{session: ClientSession|null, useTransaction: boolean}>}
 */
async function startTransactionSession() {
  let session = null;
  let useTransaction = false;

  try {
    // Check if we're in a replica set before attempting transaction
    const admin = mongoose.connection.db.admin();
    const serverInfo = await admin.serverStatus();

    if (serverInfo.repl) {
      // We're in a replica set, transactions are supported
      session = await mongoose.startSession();
      await session.startTransaction();
      useTransaction = true;
      console.log("✓ Using MongoDB transaction");
    } else {
      console.log("⚠ MongoDB standalone mode detected, proceeding without transaction");
    }
  } catch (error) {
    console.log("⚠ MongoDB transactions not available:", error.message);
    session = null;
    useTransaction = false;
  }

  return { session, useTransaction };
}

/**
 * Add session to query if transaction is being used
 * @param {Query} query - Mongoose query
 * @param {ClientSession|null} session - MongoDB session
 * @param {boolean} useTransaction - Whether transaction is active
 * @returns {Query}
 */
function addSessionToQuery(query, session, useTransaction) {
  return useTransaction && session ? query.session(session) : query;
}

/**
 * Get save options with session if transaction is being used
 * @param {ClientSession|null} session - MongoDB session
 * @param {boolean} useTransaction - Whether transaction is active
 * @returns {Object}
 */
function getSaveOptions(session, useTransaction) {
  return useTransaction && session ? { session } : {};
}

/**
 * Get update options with session if transaction is being used
 * @param {ClientSession|null} session - MongoDB session
 * @param {boolean} useTransaction - Whether transaction is active
 * @param {Object} additionalOptions - Additional options to merge
 * @returns {Object}
 */
function getUpdateOptions(session, useTransaction, additionalOptions = {}) {
  const baseOptions = useTransaction && session ? { session } : {};
  return { ...baseOptions, ...additionalOptions };
}

/**
 * Commit transaction (if active)
 * @param {ClientSession|null} session - MongoDB session
 * @param {boolean} useTransaction - Whether transaction is active
 */
async function commitTransaction(session, useTransaction) {
  if (useTransaction && session) {
    await session.commitTransaction();
    console.log("✓ Transaction committed successfully");
  }
}

/**
 * Abort transaction (if active)
 * @param {ClientSession|null} session - MongoDB session
 * @param {boolean} useTransaction - Whether transaction is active
 */
async function abortTransaction(session, useTransaction) {
  if (session) {
    try {
      await session.abortTransaction();
      if (useTransaction) {
        console.log("✓ Transaction aborted");
      }
    } catch (error) {
      console.error("Error aborting transaction:", error.message);
    }
  }
}

/**
 * End session (if active)
 * @param {ClientSession|null} session - MongoDB session
 */
function endSession(session) {
  if (session) {
    session.endSession();
  }
}

module.exports = {
  startTransactionSession,
  addSessionToQuery,
  getSaveOptions,
  getUpdateOptions,
  commitTransaction,
  abortTransaction,
  endSession,
};
