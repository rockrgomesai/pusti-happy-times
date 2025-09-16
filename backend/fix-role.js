const mongoose = require('mongoose');
const { Role } = require('./src/models');

(async () => {
  await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
  
  await Role.updateOne(
    { role: 'SuperAdmin' },
    { $set: { active: true } }
  );
  
  console.log('Set SuperAdmin role active to true');
  
  const updated = await Role.findOne({ role: 'SuperAdmin' });
  console.log('Updated role:', { role: updated.role, active: updated.active });
  
  process.exit(0);
})();