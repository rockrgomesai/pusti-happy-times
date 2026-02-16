const mongoose = require('mongoose');

mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin')
  .then(async () => {
    const Outlet = mongoose.model('Outlet', new mongoose.Schema({}, {strict: false}), 'outlets');
    
    const outlets = await Outlet.find({
      outlet_name: {$regex: /^(C1|C2|Ind)/}
    }).select('outlet_name lati longi');
    
    const coordMap = {};
    outlets.forEach(o => {
      const key = `${o.lati},${o.longi}`;
      if (!coordMap[key]) coordMap[key] = [];
      coordMap[key].push(o.outlet_name);
    });
    
    const uniqueCoords = Object.keys(coordMap).length;
    const overlapping = outlets.length - uniqueCoords;
    
    console.log('Total outlets:', outlets.length);
    console.log('Unique coordinates:', uniqueCoords);
    console.log('Overlapping outlets:', overlapping);
    console.log('\nTop 5 most crowded locations:');
    
    const sorted = Object.entries(coordMap).sort((a, b) => b[1].length - a[1].length);
    sorted.slice(0, 5).forEach(([coord, names]) => {
      console.log(`  ${coord}: ${names.length} outlets`);
      console.log(`    Examples: ${names.slice(0, 3).join(', ')}`);
    });
    
    mongoose.connection.close();
  });
