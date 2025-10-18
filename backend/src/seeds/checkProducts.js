const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const checkProducts = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    
    const count = await mongoose.connection.collection('products').countDocuments({});
    console.log('Total products:', count);
    
    const nullBangla = await mongoose.connection.collection('products').countDocuments({ bangla_name: null });
    console.log('Products with bangla_name=null:', nullBangla);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkProducts();
