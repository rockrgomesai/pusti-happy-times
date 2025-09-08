require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const { errorHandler } = require('./src/middleware/errorHandler');
const notFound = require('./src/middleware/notFound');

const app = express();

console.log('Creating Express app...');
console.log('errorHandler type:', typeof errorHandler);
console.log('notFound type:', typeof notFound);

app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

try {
  console.log('Adding notFound middleware...');
  app.use(notFound);
  console.log('notFound middleware added successfully');
} catch (error) {
  console.error('Error adding notFound middleware:', error);
}

try {
  console.log('Adding errorHandler middleware...');
  app.use(errorHandler);
  console.log('errorHandler middleware added successfully');
} catch (error) {
  console.error('Error adding errorHandler middleware:', error);
}

const PORT = 3333;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
