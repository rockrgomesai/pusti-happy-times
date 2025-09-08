try {
  console.log('Testing middleware imports...');
  const { errorHandler } = require('./src/middleware/errorHandler');
  const notFound = require('./src/middleware/notFound');
  
  console.log('errorHandler:', typeof errorHandler);
  console.log('notFound:', typeof notFound);
} catch (error) {
  console.error('Error importing middleware:', error.message);
  console.error('Stack trace:', error.stack);
}
