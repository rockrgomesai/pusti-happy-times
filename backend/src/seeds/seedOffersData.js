/**
 * Comprehensive Seed Script for Offers Module
 * Clears and populates: categories, brands, products, territories, distributors
 * 
 * Usage: node backend/src/seeds/seedOffersData.js
 */

const mongoose = require('mongoose');
const path = require('path');
const { 
  Category, 
  Brand, 
  Product, 
  Territory, 
  Distributor,
  Depot
} = require('../models');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// ========================================
// Database Connection
// ========================================
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables. Please check .env file.');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected for seeding');
    console.log(`   Using: ${mongoUri.split('@')[1] || 'local'}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// ========================================
// Clear Collections
// ========================================
const clearCollections = async () => {
  console.log('\n🗑️  Clearing existing collections...');
  
  await Category.deleteMany({});
  console.log('  ✓ Categories cleared');
  
  await Brand.deleteMany({});
  console.log('  ✓ Brands cleared');
  
  await Product.deleteMany({});
  console.log('  ✓ Products cleared');
  
  await Territory.deleteMany({});
  console.log('  ✓ Territories cleared');
  
  await Distributor.deleteMany({});
  console.log('  ✓ Distributors cleared');
  
  await Depot.deleteMany({});
  console.log('  ✓ Depots cleared');
};

// ========================================
// Seed Categories & Subcategories
// ========================================
const seedCategories = async () => {
  console.log('\n📂 Seeding categories...');
  
  const categoryData = [
    { name: 'WATER', segment: 'BEV', subcategories: ['DRINKING WATER'] },
    { name: 'AROMATIC RICE', segment: 'BIS', subcategories: ['AROMATICE RICE'] },
    { 
      name: 'BAKERY', 
      segment: 'BIS',
      subcategories: ['COOKIES', 'DRYCAKE', 'BELA', 'TOAST'] 
    },
    { 
      name: 'BISCUITS', 
      segment: 'BIS',
      subcategories: [
        'CREAM BISCUITS', 'CRACKER BISCUITS', 'DIA SALT BISCUITS',
        'ENERGY BISCUITS', 'SWEET NUT BISCUITS', 'HORLICKS BISCUITS',
        'LEXUS BISCUITS', 'MILK BISCUITS', 'ORANGE BISCUITS',
        'PINEAPPLE BISCUITS', 'POPS BISCUITS', 'SALTY SUPER BISCUITS',
        'BIO CALCIUM BISCUITS', 'GREAT CHOICE', 'COOKIS BISCUIT'
      ] 
    },
    { 
      name: 'CAKE', 
      segment: 'BIS',
      subcategories: ['CHOCOLATE CAKE', 'MILK CAKE', 'VANILA CAKE'] 
    },
    { 
      name: 'CANDY', 
      segment: 'BIS',
      subcategories: [
        'COFFEE CANDY', 'GREEN MANGO', 'LITCHI CANDY', 'LOVE CANDY',
        'MILK CANDY', 'RIPE MANGO', 'RIPE MANGO LOVE', 'TAMARIND CANDY',
        'PULSE CANDY', 'LOLLIPOP'
      ] 
    },
    { 
      name: 'CRACKERS', 
      segment: 'BIS',
      subcategories: [
        'CHICKEN CRACKERS', 'HEROS CRACKERS', 'POTATO CRACKERS', 'SIZZLER CRACKERS'
      ] 
    },
    { 
      name: 'DAIRY MILK', 
      segment: 'BIS',
      subcategories: [
        'CHOC STICK', 'DAIRY MILK BAR', 'DAIRY MILK RACING CAR', 
        'MILK STICK', 'MILK CHOCOLATE'
      ] 
    },
    { 
      name: 'FLAKES', 
      segment: 'BIS',
      subcategories: ['SOUR CREAM', 'TOMATO TANGO'] 
    },
    { 
      name: 'HONEY', 
      segment: 'BIS',
      subcategories: [
        'BLACKSEED HONEY', 'LICHI HONEY', 'MUSTARD HONEY', 'SUNDARBAN HONEY'
      ] 
    },
    { 
      name: 'MUSTARD OIL', 
      segment: 'BEV',
      subcategories: ['MUSTARD OIL BOTTLE', 'MUSTARD OIL JAR'] 
    },
    { 
      name: 'NOODLES', 
      segment: 'BIS',
      subcategories: [
        'BIO CALCIUM NOODLES', 'MASALA NOODLES', 'CHICKEN MASALA NOODLES',
        'GREEN CHILLI NOODLES', 'STICK NOODLES'
      ] 
    },
    { 
      name: 'PEANUT BAR', 
      segment: 'BIS',
      subcategories: ['PEANUT BAR REGULAR', 'PEANUT BAR CHOCOLATE'] 
    },
    { 
      name: 'POWDER DRINKS', 
      segment: 'BIS',
      subcategories: [
        'MANGO POWDER DRINKS', 'ORANGE POWDER DRINKS', 'TASTY SALINE',
        'GLUCOSE'
      ] 
    },
    { 
      name: 'PUFFED RICE', 
      segment: 'BIS',
      subcategories: ['MURI'] 
    },
    { 
      name: 'SEMAI', 
      segment: 'BIS',
      subcategories: ['LACHCHA', 'VERMECILI', 'LACCHA'] 
    },
    { 
      name: 'SNACKS', 
      segment: 'BIS',
      subcategories: [
        'ALOO BHUJIA', 'BBQ CHANACHUR', 'CHILI CHANACHUR', 'JHAL CHANACHUR',
        'DAL BHAJA', 'MOTOR BHAJA', 'PUDINA CHANACHUR'
      ] 
    },
    { 
      name: 'TEA', 
      segment: 'BIS',
      subcategories: ['TEA HoReCa', 'TEA BL'] 
    },
    { 
      name: 'WAFER', 
      segment: 'BIS',
      subcategories: ['CHOCOLATE WAFER', 'CREAM WAFER', 'CREAM WAFER STRAWBERRY'] 
    },
    { 
      name: 'OIL', 
      segment: 'BEV',
      subcategories: ['RSO', 'vSPO'] 
    },
    // Procured items (gifts only - using BIS as default)
    { 
      name: 'Umbrella', 
      segment: 'BIS',
      subcategories: ['Folding Umbrella', 'Unfold Umbrella'] 
    },
    { 
      name: 'Chair', 
      segment: 'BIS',
      subcategories: ['Free Plastic Chair'] 
    },
    { 
      name: 'BOWL', 
      segment: 'BIS',
      subcategories: ['Free MELAMINE BOWL', 'Free Plastic Bowl 800 ml'] 
    },
    { 
      name: 'BLANKET', 
      segment: 'BIS',
      subcategories: ['Free BLANKET'] 
    },
    { 
      name: 'T-Shirt', 
      segment: 'BIS',
      subcategories: ['T-Shirt Round Neck', 'T-Shirt V-Neck'] 
    },
    { 
      name: 'Tiffin Box', 
      segment: 'BIS',
      subcategories: ['Free Tiffin Box'] 
    },
    { 
      name: 'TV', 
      segment: 'BIS',
      subcategories: ['LED TV 32"', 'LED TV 42"', 'Smart TV 55"'] 
    },
    { 
      name: 'Refrigerator', 
      segment: 'BIS',
      subcategories: ['Mini Fridge', 'Deep Freezer'] 
    }
  ];

  const categoryMap = new Map();
  const SEED_USER = 'system_seed';

  for (const catData of categoryData) {
    const category = await Category.create({
      name: catData.name,
      parent_id: null,
      product_segment: catData.segment,
      active: true,
      created_by: SEED_USER,
      updated_by: SEED_USER
    });

    categoryMap.set(catData.name, {
      parent: category,
      subcategories: []
    });

    for (const subName of catData.subcategories) {
      const subcategory = await Category.create({
        name: subName,
        parent_id: category._id,
        product_segment: catData.segment,
        active: true,
        created_by: SEED_USER,
        updated_by: SEED_USER
      });
      categoryMap.get(catData.name).subcategories.push(subcategory);
    }
  }

  console.log(`  ✓ Created ${categoryMap.size} categories with subcategories`);
  return categoryMap;
};

// ========================================
// Seed Brands
// ========================================
const seedBrands = async () => {
  console.log('\n🏷️  Seeding brands...');
  
  const SEED_USER = new mongoose.Types.ObjectId('000000000000000000000001'); // System seed user
  
  const brandNames = [
    'Pusti', 'Fresh', 'Premium', 'Classic', 'Gold', 'Royal', 
    'Super', 'Mega', 'Ultra', 'Prime'
  ];

  const brands = await Brand.insertMany(
    brandNames.map(name => ({
      brand: name,  // Field is 'brand', not 'name'
      created_by: SEED_USER,
      updated_by: SEED_USER
    }))
  );

  console.log(`  ✓ Created ${brands.length} brands`);
  return brands;
};

// ========================================
// Seed Depots
// ========================================
const seedDepots = async () => {
  console.log('\n🏭 Seeding depots...');
  
  const SEED_USER = new mongoose.Types.ObjectId('000000000000000000000001');
  
  const depotNames = [
    'Dhaka Central Depot',
    'Chittagong Depot',
    'Sylhet Depot',
    'Rajshahi Depot',
    'Khulna Depot'
  ];

  const depots = await Depot.insertMany(
    depotNames.map(name => ({
      name,
      created_by: SEED_USER,
      updated_by: SEED_USER
    }))
  );

  console.log(`  ✓ Created ${depots.length} depots`);
  return depots;
};

// ========================================
// Seed Products
// ========================================
const seedProducts = async (categoryMap, brands, depots) => {
  console.log('\n📦 Seeding products...');
  
  const SEED_USER = 'system_seed';
  const products = [];
  const procuredCategories = ['Umbrella', 'Chair', 'BOWL', 'BLANKET', 'T-Shirt', 'Tiffin Box', 'TV', 'Refrigerator'];
  const bevCategories = ['WATER', 'OIL', 'MUSTARD OIL'];
  
  // Select random depots for MANUFACTURED products
  const getRandomDepots = () => {
    const numDepots = Math.floor(Math.random() * depots.length) + 1; // 1 to all depots
    const shuffled = [...depots].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numDepots).map(d => d._id);
  };
  
  for (const [parentName, catInfo] of categoryMap) {
    const isProcured = procuredCategories.includes(parentName);
    const isBEV = bevCategories.includes(parentName);
    
    // Define weights/sizes based on category
    let variants = [];
    
    if (parentName === 'BISCUITS' || parentName === 'BAKERY' || parentName === 'CAKE') {
      variants = ['50g', '100g', '200g', '500g', '1kg'];
    } else if (parentName === 'WATER') {
      variants = ['500ml', '1L', '2L', '5L', '20L'];
    } else if (parentName === 'OIL' || parentName === 'MUSTARD OIL') {
      variants = ['500ml', '1L', '2L', '5L'];
    } else if (parentName === 'NOODLES') {
      variants = ['Pack', '4-Pack', 'Family Pack'];
    } else if (parentName === 'CANDY') {
      variants = ['100g', '200g', '500g', 'Jar 1kg'];
    } else if (parentName === 'SNACKS' || parentName === 'CRACKERS') {
      variants = ['75g', '150g', '250g', '500g'];
    } else if (isProcured) {
      variants = ['Standard'];
    } else {
      variants = ['Small', 'Medium', 'Large', 'Family Pack'];
    }

    for (const subcategory of catInfo.subcategories) {
      const randomBrand = brands[Math.floor(Math.random() * brands.length)];

      for (const variant of variants) {
        const tradePrice = isProcured ? 0 : Math.floor(Math.random() * 400) + 100;
        const mrp = isProcured ? null : Math.floor(tradePrice * 1.25);
        const dbPrice = isProcured ? null : tradePrice * 0.95; // Slightly lower than trade price
        const wtPcs = isProcured ? 1 : (Math.random() * 500 + 50); // grams
        const ctnPcs = isProcured ? null : Math.floor(Math.random() * 20) + 12;
        const unit = isProcured ? 'PCS' : ['CTN', 'BOX', 'CASE', 'JAR'][Math.floor(Math.random() * 4)];
        
        // Generate unique SKU with timestamp component
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const sku = `${subcategory.name.substring(0, 3).toUpperCase()}-${variant.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6)}-${timestamp}-${random}`;
        
        const product = {
          product_type: isProcured ? 'PROCURED' : 'MANUFACTURED',
          brand_id: randomBrand._id,
          category_id: subcategory._id,
          sku: sku,
          trade_price: tradePrice,
          unit: unit,
          wt_pcs: wtPcs,
          active: true,
          created_by: SEED_USER,
          updated_by: SEED_USER
        };
        
        // Add fields only for MANUFACTURED products
        if (!isProcured) {
          product.depot_ids = getRandomDepots();
          product.db_price = dbPrice;
          product.mrp = mrp;
          product.ctn_pcs = ctnPcs;
          product.launch_date = Math.random() > 0.85 
            ? new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000) 
            : null;
        }
        
        products.push(product);
      }
    }
  }

  try {
    const createdProducts = await Product.insertMany(products, { ordered: false });
    console.log(`  ✓ Created ${createdProducts.length} products`);
    
    // Count by type
    const manufactured = createdProducts.filter(p => p.product_type === 'MANUFACTURED').length;
    const procured = createdProducts.filter(p => p.product_type === 'PROCURED').length;
    
    console.log(`    - MANUFACTURED: ${manufactured}`);
    console.log(`    - PROCURED: ${procured} (gift items)`);
    
    return createdProducts;
  } catch (error) {
    // With ordered:false, some products may still be inserted even if there's an error
    if (error.result && error.result.insertedIds) {
      const insertedCount = Object.keys(error.result.insertedIds).length;
      console.log(`  ⚠️  Created ${insertedCount} products (some skipped due to duplicates)`);
      
      // Fetch the inserted products
      const insertedProducts = await Product.find({
        _id: { $in: Object.values(error.result.insertedIds) }
      });
      
      const manufactured = insertedProducts.filter(p => p.product_type === 'MANUFACTURED').length;
      const procured = insertedProducts.filter(p => p.product_type === 'PROCURED').length;
      
      console.log(`    - MANUFACTURED: ${manufactured}`);
      console.log(`    - PROCURED: ${procured} (gift items)`);
      
      return insertedProducts;
    }
    throw error; // Re-throw if it's not a bulk write error
  }
};

// ========================================
// Seed Territories (z1-z4 pattern)
// ========================================
const seedTerritories = async () => {
  console.log('\n🗺️  Seeding territories...');
  
  const SEED_USER = new mongoose.Types.ObjectId('000000000000000000000001');
  const territoryMap = {
    zones: [],
    regions: [],
    areas: [],
    dbPoints: []
  };

  // Create 4 Zones: z1, z2, z3, z4
  console.log('  Creating zones...');
  for (let z = 1; z <= 4; z++) {
    const zone = await Territory.create({
      name: `Zone ${z} (z${z})`,
      type: 'zone',
      level: 0,
      parent_id: null,
      ancestors: [],
      active: true,
      created_by: SEED_USER,
      updated_by: SEED_USER
    });
    territoryMap.zones.push(zone);
  }
  console.log(`    ✓ Created ${territoryMap.zones.length} zones`);

  // Create 16 Regions: z1r1-z1r4, z2r5-z2r8, z3r9-z3r12, z4r13-z4r16
  console.log('  Creating regions...');
  let regionCounter = 1;
  for (const zone of territoryMap.zones) {
    for (let r = 1; r <= 4; r++) {
      const region = await Territory.create({
        name: `Region r${regionCounter} (z${territoryMap.zones.indexOf(zone) + 1}r${regionCounter})`,
        type: 'region',
        level: 1,
        parent_id: zone._id,
        ancestors: [zone._id],
        active: true,
        created_by: SEED_USER,
        updated_by: SEED_USER
      });
      territoryMap.regions.push(region);
      regionCounter++;
    }
  }
  console.log(`    ✓ Created ${territoryMap.regions.length} regions`);

  // Create 64 Areas: z1r1a1-z1r1a4, ... z4r16a64
  console.log('  Creating areas...');
  let areaCounter = 1;
  for (const region of territoryMap.regions) {
    for (let a = 1; a <= 4; a++) {
      const area = await Territory.create({
        name: `Area a${areaCounter}`,
        type: 'area',
        level: 2,
        parent_id: region._id,
        ancestors: [...region.ancestors, region._id],
        active: true,
        created_by: SEED_USER,
        updated_by: SEED_USER
      });
      territoryMap.areas.push(area);
      areaCounter++;
    }
  }
  console.log(`    ✓ Created ${territoryMap.areas.length} areas`);

  // Create 256 DB Points: z1r1a1p1-z1r1a1p4, ... z4r16a64p256
  console.log('  Creating DB points...');
  let dbPointCounter = 1;
  for (const area of territoryMap.areas) {
    for (let p = 1; p <= 4; p++) {
      const dbPoint = await Territory.create({
        name: `DB Point p${dbPointCounter}`,
        type: 'db_point',
        level: 3,
        parent_id: area._id,
        ancestors: [...area.ancestors, area._id],
        active: true,
        created_by: SEED_USER,
        updated_by: SEED_USER
      });
      territoryMap.dbPoints.push(dbPoint);
      dbPointCounter++;
    }
  }
  console.log(`    ✓ Created ${territoryMap.dbPoints.length} DB points`);

  console.log(`\n  📊 Territory Summary:`);
  console.log(`    Zones: ${territoryMap.zones.length}`);
  console.log(`    Regions: ${territoryMap.regions.length}`);
  console.log(`    Areas: ${territoryMap.areas.length}`);
  console.log(`    DB Points: ${territoryMap.dbPoints.length}`);

  return territoryMap;
};

// ========================================
// Seed Distributors
// ========================================
const seedDistributors = async (territoryMap) => {
  console.log('\n👥 Seeding distributors...');
  
  const SEED_USER = new mongoose.Types.ObjectId('000000000000000000000001');
  const distributors = [];
  const distributorTypes = [
    'Commission Distributor',
    'General Distributor', 
    'Special Distributor',
    'Spot Distributor',
    'Super Distributor'
  ];

  // Create 2-3 distributors per DB point (512-768 total)
  for (let i = 0; i < territoryMap.dbPoints.length; i++) {
    const dbPoint = territoryMap.dbPoints[i];
    const distributorsPerPoint = Math.floor(Math.random() * 2) + 2; // 2-3 per point

    for (let d = 0; d < distributorsPerPoint; d++) {
      const distNumber = (i * 3) + d + 1;
      const distType = distributorTypes[Math.floor(Math.random() * distributorTypes.length)];
      
      // Randomly assign segment(s)
      const segmentChoice = Math.random();
      const productSegment = segmentChoice < 0.4 ? ['BIS'] : 
                            segmentChoice < 0.7 ? ['BEV'] : 
                            ['BIS', 'BEV'];
      
      const creditLimitValue = distType === 'Super Distributor' ? 500000 : 
                               distType === 'Special Distributor' ? 300000 : 
                               150000;
      
      distributors.push({
        name: `Distributor-${String(distNumber).padStart(4, '0')}`,
        db_point_id: dbPoint._id,
        product_segment: productSegment,
        distributor_type: distType,
        mobile: `+88017${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        credit_limit: mongoose.Types.Decimal128.fromString(creditLimitValue.toString()),
        bank_guarantee: mongoose.Types.Decimal128.fromString('0.00'),
        unit: Math.random() > 0.5 ? 'CTN' : 'PCS',
        computer: Math.random() > 0.7 ? 'Yes' : 'No',
        printer: Math.random() > 0.6 ? 'Yes' : 'No',
        active: true,
        created_by: SEED_USER,
        updated_by: SEED_USER
      });
    }
  }

  const createdDistributors = await Distributor.insertMany(distributors);
  console.log(`  ✓ Created ${createdDistributors.length} distributors`);
  
  // Count by segment and type
  const bisOnly = createdDistributors.filter(d => 
    d.product_segment.length === 1 && d.product_segment[0] === 'BIS'
  ).length;
  const bevOnly = createdDistributors.filter(d => 
    d.product_segment.length === 1 && d.product_segment[0] === 'BEV'
  ).length;
  const both = createdDistributors.filter(d => d.product_segment.length === 2).length;
  
  const byType = {};
  distributorTypes.forEach(type => {
    byType[type] = createdDistributors.filter(d => d.distributor_type === type).length;
  });
  
  console.log(`\n  📊 Distributor Summary:`);
  console.log(`    By Segment: BIS only: ${bisOnly}, BEV only: ${bevOnly}, Both: ${both}`);
  console.log(`    By Type:`, byType);

  return createdDistributors;
};

// ========================================
// Main Seed Function
// ========================================
const seedAll = async () => {
  try {
    console.log('\n🌱 Starting comprehensive seed process...\n');
    console.log('='.repeat(60));

    await connectDB();
    await clearCollections();

    const categoryMap = await seedCategories();
    const brands = await seedBrands();
    const depots = await seedDepots();
    const products = await seedProducts(categoryMap, brands, depots);
    const territoryMap = await seedTerritories();
    const distributors = await seedDistributors(territoryMap);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Seeding completed successfully!\n');
    console.log('📊 Final Summary:');
    console.log(`  Categories: ${categoryMap.size} parent categories`);
    console.log(`  Brands: ${brands.length}`);
    console.log(`  Depots: ${depots.length}`);
    console.log(`  Products: ${products.length}`);
    console.log(`  Territories: ${territoryMap.zones.length + territoryMap.regions.length + territoryMap.areas.length + territoryMap.dbPoints.length}`);
    console.log(`  Distributors: ${distributors.length}`);
    console.log('\n' + '='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedAll();
}

module.exports = { seedAll };
