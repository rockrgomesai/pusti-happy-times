const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InvoiceItemSchema = new Schema({
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
  qty: {
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
  unit_price: {
    type: Schema.Types.Decimal128,
    required: true,
    get: function(value) {
      return value ? parseFloat(value.toString()) : 0;
    }
  },
  line_total: {
    type: Schema.Types.Decimal128,
    required: true,
    get: function(value) {
      return value ? parseFloat(value.toString()) : 0;
    }
  }
}, { _id: false, toJSON: { getters: true }, toObject: { getters: true } });

const DeliveryInvoicesSchema = new Schema({
  invoice_number: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  chalan_id: {
    type: Schema.Types.ObjectId,
    ref: 'DeliveryChalans',
    required: true,
    index: true
  },
  chalan_number: {
    type: String,
    required: true,
    index: true
  },
  load_sheet_id: {
    type: Schema.Types.ObjectId,
    ref: 'LoadSheet',
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
  distributor_tin: String,
  items: [InvoiceItemSchema],
  total_amount: {
    type: Schema.Types.Decimal128,
    required: true,
    get: function(value) {
      return value ? parseFloat(value.toString()) : 0;
    }
  },
  discount: {
    type: Schema.Types.Decimal128,
    default: 0,
    get: function(value) {
      return value ? parseFloat(value.toString()) : 0;
    }
  },
  payment_terms: String,
  due_date: Date,
  status: {
    type: String,
    enum: ['Unpaid', 'Partial', 'Paid', 'Cancelled'],
    default: 'Unpaid',
    index: true
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
  payment_history: [{
    amount: Schema.Types.Decimal128,
    payment_date: Date,
    payment_method: String,
    reference: String,
    recorded_by: {
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
DeliveryInvoicesSchema.index({ status: 1, created_at: -1 });
DeliveryInvoicesSchema.index({ depot_id: 1, status: 1 });
DeliveryInvoicesSchema.index({ distributor_id: 1, status: 1 });
DeliveryInvoicesSchema.index({ due_date: 1 });

// Auto-generate invoice_number
DeliveryInvoicesSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoice_number) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `INV-${year}${month}${day}`;
    
    // Find the last invoice for today
    const lastInvoice = await this.constructor
      .findOne({ invoice_number: new RegExp(`^${prefix}`) })
      .sort({ invoice_number: -1 })
      .select('invoice_number');
    
    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoice_number.split('-').pop());
      sequence = lastSequence + 1;
    }
    
    this.invoice_number = `${prefix}-${String(sequence).padStart(3, '0')}`;
  }
  next();
});

// Virtual for total items
DeliveryInvoicesSchema.virtual('total_items').get(function() {
  return this.items.length;
});

// Virtual for is overdue
DeliveryInvoicesSchema.virtual('is_overdue').get(function() {
  if (this.status === 'Paid' || !this.due_date) return false;
  return new Date() > this.due_date;
});

module.exports = mongoose.model('DeliveryInvoices', DeliveryInvoicesSchema);
