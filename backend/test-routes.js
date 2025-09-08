require('dotenv').config({ path: __dirname + '/.env' });

try {
  console.log('Testing routes import...');
  const apiRoutes = require('./src/routes');
  console.log('Routes imported successfully:', typeof apiRoutes);
  console.log('Routes type:', apiRoutes.constructor.name);
} catch (error) {
  console.error('Error importing routes:', error.message);
  console.error('Stack trace:', error.stack);
}
