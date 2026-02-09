const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin';

// Bangladesh city/area coordinates for realistic data
const bangladeshLocations = [
  // Dhaka Division
  { name: 'Dhaka Central', lat: 23.8103, lng: 90.4125 },
  { name: 'Mirpur', lat: 23.8223, lng: 90.3654 },
  { name: 'Uttara', lat: 23.8759, lng: 90.3795 },
  { name: 'Gulshan', lat: 23.7808, lng: 90.4161 },
  { name: 'Mohammadpur', lat: 23.7658, lng: 90.3593 },
  { name: 'Dhanmondi', lat: 23.7461, lng: 90.3742 },
  { name: 'Motijheel', lat: 23.7330, lng: 90.4172 },
  { name: 'Narayanganj', lat: 23.6238, lng: 90.5000 },
  { name: 'Gazipur', lat: 23.9999, lng: 90.4203 },
  { name: 'Tongi', lat: 23.8907, lng: 90.4077 },
  
  // Chittagong Division
  { name: 'Chittagong City', lat: 22.3569, lng: 91.7832 },
  { name: 'Agrabad', lat: 22.3308, lng: 91.8098 },
  { name: 'Khulshi', lat: 22.3395, lng: 91.8067 },
  { name: 'Pahartali', lat: 22.3644, lng: 91.8197 },
  { name: 'Cox\'s Bazar', lat: 21.4272, lng: 92.0058 },
  
  // Sylhet Division
  { name: 'Sylhet City', lat: 24.8949, lng: 91.8687 },
  { name: 'Zindabazar', lat: 24.8978, lng: 91.8714 },
  { name: 'Moulvibazar', lat: 24.4820, lng: 91.7316 },
  
  // Khulna Division
  { name: 'Khulna City', lat: 22.8456, lng: 89.5403 },
  { name: 'Jessore', lat: 23.1697, lng: 89.2131 },
  { name: 'Satkhira', lat: 22.7185, lng: 89.0705 },
  
  // Rajshahi Division
  { name: 'Rajshahi City', lat: 24.3745, lng: 88.6042 },
  { name: 'Bogra', lat: 24.8465, lng: 89.3770 },
  { name: 'Pabna', lat: 24.0064, lng: 89.2372 },
  
  // Rangpur Division
  { name: 'Rangpur City', lat: 25.7439, lng: 89.2752 },
  { name: 'Dinajpur', lat: 25.6217, lng: 88.6354 },
  
  // Barisal Division
  { name: 'Barisal City', lat: 22.7010, lng: 90.3535 },
  { name: 'Patuakhali', lat: 22.3596, lng: 90.3298 },
  
  // Mymensingh Division
  { name: 'Mymensingh City', lat: 24.7471, lng: 90.4203 },
  { name: 'Netrokona', lat: 24.8103, lng: 90.7279 }
];

// Helper to get random Bangladesh location
function getRandomLocation() {
  return bangladeshLocations[Math.floor(Math.random() * bangladeshLocations.length)];
}

// Helper to add small random offset for nearby locations (within ~500m)
function addSmallOffset(lat, lng) {
  // ~0.005 degrees ≈ 500 meters
  const offset = 0.005;
  return {
    lat: lat + (Math.random() - 0.5) * offset,
    lng: lng + (Math.random() - 0.5) * offset
  };
}

async function addCoordinatesToOutlets() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Route = mongoose.model('Route', new mongoose.Schema({}, { strict: false, collection: 'routes' }));
    const Outlet = mongoose.model('Outlet', new mongoose.Schema({}, { strict: false, collection: 'outlets' }));

    // The 6 routes we assigned to SOs
    const assignedRouteNames = [
      'R1-DPBEV2-D1',
      'R1-DPBIS1-D1',
      'R1-DPBIS1-D2',
      'R2-DPBIS1-D2',
      'R1-DPBIS2-D2',
      'R2-DPBIS2-D2'
    ];

    console.log('Finding assigned routes...');
    const routes = await Route.find({ name: { $in: assignedRouteNames } });
    
    if (routes.length === 0) {
      console.log('No routes found!');
      return;
    }

    console.log(`Found ${routes.length} routes\n`);

    // First 3 routes: CLUSTERED (many outlets share same coordinates)
    // Last 3 routes: SEPARATE (each outlet has unique coordinates)
    
    let totalUpdated = 0;
    
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const isClustered = i < 3; // First 3 routes are clustered
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Processing Route ${i + 1}/${routes.length}: ${route.name}`);
      console.log(`Strategy: ${isClustered ? 'CLUSTERED (10-20 clusters)' : 'SEPARATE (unique locations)'}`);
      console.log(`${'='.repeat(80)}`);
      
      const outlets = await Outlet.find({ route_id: route._id });
      console.log(`Found ${outlets.length} outlets`);
      
      if (outlets.length === 0) {
        console.log('No outlets to update');
        continue;
      }

      let updated = 0;
      
      if (isClustered) {
        // CLUSTERED STRATEGY: Create 10-20 cluster centers
        const numClusters = Math.min(20, Math.floor(outlets.length / 10) + 5);
        const clusterCenters = [];
        
        // Generate cluster centers
        for (let j = 0; j < numClusters; j++) {
          clusterCenters.push(getRandomLocation());
        }
        
        console.log(`Created ${numClusters} cluster centers`);
        
        // Assign outlets to clusters
        for (const outlet of outlets) {
          const cluster = clusterCenters[Math.floor(Math.random() * numClusters)];
          
          // Add small offset for some variety within cluster
          const coords = Math.random() < 0.7 
            ? { lat: cluster.lat, lng: cluster.lng } // 70% exact cluster center
            : addSmallOffset(cluster.lat, cluster.lng); // 30% nearby
          
          await Outlet.updateOne(
            { _id: outlet._id },
            { 
              $set: { 
                latitude: coords.lat,
                longitude: coords.lng
              }
            }
          );
          updated++;
        }
        
        console.log(`✓ Updated ${updated} outlets with ${numClusters} cluster centers`);
        
      } else {
        // SEPARATE STRATEGY: Each outlet gets unique coordinates
        for (const outlet of outlets) {
          const location = getRandomLocation();
          
          // Add random offset to ensure uniqueness
          const coords = addSmallOffset(location.lat, location.lng);
          
          await Outlet.updateOne(
            { _id: outlet._id },
            { 
              $set: { 
                latitude: coords.lat,
                longitude: coords.lng
              }
            }
          );
          updated++;
        }
        
        console.log(`✓ Updated ${updated} outlets with unique separate locations`);
      }
      
      totalUpdated += updated;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Successfully updated ${totalUpdated} outlets across ${routes.length} routes`);
    console.log(`${'='.repeat(80)}`);
    
    // Verification
    console.log('\nVerification:');
    console.log('-'.repeat(80));
    
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const outlets = await Outlet.find({ route_id: route._id, latitude: { $ne: null }, longitude: { $ne: null } });
      
      // Count unique locations
      const uniqueLocations = new Set(outlets.map(o => `${o.latitude},${o.longitude}`)).size;
      const clusterRatio = outlets.length > 0 
        ? ((outlets.length - uniqueLocations) / outlets.length * 100).toFixed(1)
        : 0;
      
      const strategy = i < 3 ? '🔵 CLUSTERED' : '🟢 SEPARATE';
      console.log(`${route.name}: ${outlets.length} outlets, ${uniqueLocations} unique locations, ${clusterRatio}% clustering ${strategy}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

addCoordinatesToOutlets();
