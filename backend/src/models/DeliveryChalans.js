const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChalanItemSchema = new Schema({
  do_id: {
    type: Schema.Types.ObjectId,
    ref: 'DemandOrder',
    required: true
  },
  order_number: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true,
    index: true
  },
  qty_delivered: {
    type: Schema.Types.Decimal128,
    required: true,
    get: function(value) {
      return value ? parseFloat(value.toString()) : 0;
    }
  },
  unit: {
    type: String,
    default: 'CTN'
  },
  uom: {
    type: String,
    default: 'PCS'
  }
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const DeliveryChalansSchema = new Schema({
  chalan_number: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  load_sheet_id: {
    type: Schema.Types.ObjectId,
    ref: 'LoadSheet',
    required: true,
    index: true
  },
  load_sheet_number: {
    type: String,
    required: true,
    index: true
  },
  distributor_id: {
    type: Schema.Types.ObjectId,
    ref: 'Distributor',
    required: true,
    index: true
  },
  distributor_name: {
    type: String,
    required: true
  },
  distributor_code: {
    type: String,
    required: true
  },
  distributor_address: String,
  distributor_phone: String,
  items: [ChalanItemSchema],
  delivery_date: {
    type: Date,
    required: true,
    index: true
  },
  vehicle_no: {
    type: String,
    required: true
  },
  driver_name: {
    type: String,
    required: true
  },
  driver_phone: String,
  status: {
    type: String,
    enum: ['Pending', 'InTransit', 'Delivered', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  receipt_status: {
    type: String,
    enum: ['Pending', 'Received'],
    default: 'Pending',
    index: true
  },
  received_at: Date,
  received_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  received_items: [{
    sku: String,
    delivered_qty: Schema.Types.Decimal128,
    received_qty: Schema.Types.Decimal128,
    variance_qty: Schema.Types.Decimal128,
    variance_reason: String
  }],
  source_type: {
    type: String,
    enum: ['LoadSheet', 'Manual'],
    default: 'LoadSheet'
  },
  depot_id: {
    type: Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
    index: true
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String,
  status_history: [{
    status: String,
    changed_at: Date,
    changed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes for efficient queries
DeliveryChalansSchema.index({ status: 1, delivery_date: -1 });
DeliveryChalansSchema.index({ depot_id: 1, status: 1 });
DeliveryChalansSchema.index({ distributor_id: 1, delivery_date: -1 });

// Auto-generate chalan_number
DeliveryChalansSchema.pre('save', async function(next) {
  if (this.isNew && !this.chalan_number) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `CH-${year}${month}${day}`;
    
    // Find the last chalan for today
    const lastChalan = await this.constructor
      .findOne({ chalan_number: new RegExp(`^${prefix}`) })
      .sort({ chalan_number: -1 })
      .select('chalan_number');
    
    let sequence = 1;
    if (lastChalan) {
      const lastSequence = parseInt(lastChalan.chalan_number.split('-').pop());
      sequence = lastSequence + 1;
    }
    
    this.chalan_number = `${prefix}-${String(sequence).padStart(3, '0')}`;
  }
  next();
});

// Virtual for total items
DeliveryChalansSchema.virtual('total_items').get(function() {
  return this.items.length;
});

// Virtual for total quantity
DeliveryChalansSchema.virtual('total_quantity').get(function() {
  return this.items.reduce((sum, item) => sum + (item.qty_delivered || 0), 0);
});

module.exports = mongoose.model('DeliveryChalans', DeliveryChalansSchema);
