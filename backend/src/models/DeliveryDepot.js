/**
 * DeliveryDepot Model
 * Pusti Happy Times - Delivery Depot Master Data Schema
 *
 * Manages delivery depot information for distributor assignments.
 */

const mongoose = require("mongoose");

// Division and District enums (same as Employee model)
const DIVISIONS = Object.freeze([
  "Dhaka",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Rangpur",
  "Barishal",
  "Sylhet",
  "Mymensingh",
]);

const DISTRICTS = Object.freeze([
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
  "Narail",
]);

/**
 * DeliveryDepot Schema Definition
 */
const deliveryDepotSchema = new mongoose.Schema(
  {
    // Depot name - unique identifier
    name: {
      type: String,
      required: [true, "Delivery depot name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },

    // Address - optional
    address: {
      type: String,
      trim: true,
      maxlength: [500, "Address must be at most 500 characters"],
      default: null,
    },

    // District - optional
    district: {
      type: String,
      trim: true,
      enum: {
        values: DISTRICTS,
        message: "{VALUE} is not a valid district",
      },
      default: null,
    },

    // Division - optional
    division: {
      type: String,
      trim: true,
      enum: {
        values: DIVISIONS,
        message: "{VALUE} is not a valid division",
      },
      default: null,
    },

    // Active status
    active: {
      type: Boolean,
      default: true,
      required: true,
    },

    // Audit fields - created
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Audit fields - updated
    updated_at: {
      type: Date,
      default: Date.now,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: false, // Using custom audit fields
    collection: "delivery_depots",
    versionKey: false,
  }
);

/**
 * Indexes for Performance Optimization
 */
// Unique index on name
deliveryDepotSchema.index({ name: 1 }, { unique: true });

// Index for active lookups
deliveryDepotSchema.index({ active: 1 });

// Index for location-based queries
deliveryDepotSchema.index({ district: 1, division: 1 });

/**
 * Pre-save Middleware
 */
deliveryDepotSchema.pre("save", function (next) {
  // Update the updated_at timestamp
  this.updated_at = new Date();
  next();
});

/**
 * Static Methods
 */

/**
 * Find delivery depot by name
 * @param {String} name - The depot name to search for
 * @returns {Object|null} DeliveryDepot document or null
 */
deliveryDepotSchema.statics.findByName = async function (name) {
  try {
    return await this.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
  } catch (error) {
    throw new Error(`Error finding delivery depot: ${error.message}`);
  }
};

/**
 * Get all active delivery depots
 * @returns {Array} Array of active delivery depot documents
 */
deliveryDepotSchema.statics.getActiveDepots = async function () {
  try {
    return await this.find({ active: true }).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching active delivery depots: ${error.message}`);
  }
};

/**
 * Get delivery depots by district
 * @param {String} district - The district name
 * @returns {Array} Array of delivery depot documents
 */
deliveryDepotSchema.statics.getByDistrict = async function (district) {
  try {
    return await this.find({ district, active: true }).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching delivery depots by district: ${error.message}`);
  }
};

/**
 * Get delivery depots by division
 * @param {String} division - The division name
 * @returns {Array} Array of delivery depot documents
 */
deliveryDepotSchema.statics.getByDivision = async function (division) {
  try {
    return await this.find({ division, active: true }).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching delivery depots by division: ${error.message}`);
  }
};

/**
 * Check if depot name is available
 * @param {String} name - The depot name to check
 * @param {String} excludeId - Optional ID to exclude from check (for updates)
 * @returns {Boolean} True if name is available, false otherwise
 */
deliveryDepotSchema.statics.isNameAvailable = async function (name, excludeId = null) {
  try {
    const query = { 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await this.findOne(query);
    return !existing;
  } catch (error) {
    return false;
  }
};

// Export the model and constants
module.exports = mongoose.model("DeliveryDepot", deliveryDepotSchema);
module.exports.DIVISIONS = DIVISIONS;
module.exports.DISTRICTS = DISTRICTS;
