// MongoDB Initialization Script for Pusti Happy Times MERN Application
// This script runs when MongoDB container starts for the first time

print('Starting MongoDB initialization...');

// Switch to the pusti_happy_times database
db = db.getSiblingDB('pusti_happy_times');

print('Database pusti_happy_times created and ready for manual collection creation...');
