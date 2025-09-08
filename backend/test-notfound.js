try {
  console.log('Testing notFound import directly...');
  const notFound = require('./src/middleware/notFound');
  console.log('notFound result:', notFound);
  console.log('notFound type:', typeof notFound);
  console.log('notFound keys:', Object.keys(notFound || {}));
} catch (error) {
  console.error('Error importing notFound:', error.message);
  console.error('Stack trace:', error.stack);
}
