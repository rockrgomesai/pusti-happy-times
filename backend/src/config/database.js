/**
 * MongoDB Database Configuration
 * Pusti Happy Times - Database Connection Module
 * 
 * This module handles the MongoDB connection using Mongoose ODM with
 * comprehensive error handling, connection monitoring, and optimization
 * for production environments.
 * 
 * Features:
 * - Automatic reconnection handling
 * - Connection event logging
 * - Production-optimized settings
 * - Graceful error handling
 * - Connection state monitoring
 */

const mongoose = require('mongoose');

/**
 * MongoDB Connection Configuration
 * Optimized settings for production deployment with proper error handling
 */
const connectDB = async () => {
  try {
    // MongoDB connection options for production optimization
    const options = {
      // Connection pool settings
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      
      // Buffer settings (disabled for newer Mongoose versions)
      bufferCommands: false, // Disable mongoose buffering
      
      // Additional production settings
      retryWrites: true,
      w: 'majority', // Write concern
      readPreference: 'primary', // Read from primary node
    };

    // Determine MongoDB URI based on environment
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI 
      : process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    const conn = await mongoose.connect(mongoURI, options);

    console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║                    🍃 MONGODB CONNECTED 🍃                   ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Host:        ${conn.connection.host.padEnd(47)} ║
    ║  Database:    ${conn.connection.name.padEnd(47)} ║
    ║  Port:        ${conn.connection.port.toString().padEnd(47)} ║
    ║  ReadyState:  ${getConnectionState(conn.connection.readyState).padEnd(47)} ║
    ║  Environment: ${process.env.NODE_ENV?.toUpperCase().padEnd(47)} ║
    ╚══════════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Log additional error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', error);
    }
    
    // Exit process with failure code
    process.exit(1);
  }
};

/**
 * Get human-readable connection state
 * @param {number} state - Mongoose connection state number
 * @returns {string} Human-readable connection state
 */
const getConnectionState = (state) => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  return states[state] || 'Unknown';
};

/**
 * MongoDB Connection Event Handlers
 * Monitor connection events for debugging and logging purposes
 */

// Connection successful
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

// Connection error
mongoose.connection.on('error', (error) => {
  console.error('❌ Mongoose connection error:', error.message);
  
  // Log additional error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Full error details:', error);
  }
});

// Connection disconnected
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Application termination - close connection
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔐 Mongoose connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing Mongoose connection:', error);
    process.exit(1);
  }
});

/**
 * Database Health Check Function
 * Utility function to check database connection status
 */
const checkDBHealth = () => {
  const state = mongoose.connection.readyState;
  return {
    status: state === 1 ? 'healthy' : 'unhealthy',
    state: getConnectionState(state),
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    port: mongoose.connection.port
  };
};

/**
 * Get Database Statistics
 * Utility function to get database statistics for monitoring
 */
const getDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
      indexes: stats.indexes,
      objects: stats.objects
    };
  } catch (error) {
    console.error('Error getting database statistics:', error);
    return null;
  }
};

module.exports = {
  connectDB,
  checkDBHealth,
  getDBStats,
  getConnectionState
};
