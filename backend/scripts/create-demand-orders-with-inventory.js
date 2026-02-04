/**
 * Create Demand Orders with Full Workflow and Inventory
 * 
 * Creates:
 * 1. 2 DOs per distributor (24 total)
 * 2. Each DO has 10+ categories of products
 * 3. Each product quantity is 100+
 * 4. Common products across DOs with different prices (for FIFO testing)
 * 5. Processes full approval workflow
 * 6. Receives goods into distributor stock
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function createDemandOrdersWithInventory() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Define models
    const Distributor = mongoose.model("Distributor", new mongoose.Schema({}, { strict: false }), "distributors");
    const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }), "products");
    const Category = mongoose.model("Category", new mongoose.Schema({}, { strict: false }), "categories");
    const DemandOrder = mongoose.model("DemandOrder", new mongoose.Schema({}, { strict: false }), "demand_orders");
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
    const DeliveryChalan = mongoose.model("DeliveryChalan", new mongoose.Schema({}, { strict: false }), "delivery_chalans");
    const DistributorStock = mongoose.model("DistributorStock", new mongoose.Schema({}, { strict: false }), "distributor_stocks");
    const Facility = mongoose.model("Facility", new mongoose.Schema({}, { strict: false }), "facilities");

    console.log("📦 Step 1: Fetching distributors and products...\n");

    // Get all BIS/BEV distributors
    const distributors = await Distributor.find({
      distributor_id: /^(DPBIS|DPBEV|DPBISBEV)/
    }).sort({ distributor_id: 1 }).lean();

    console.log(`Found ${distributors.length} distributors`);

    // Get active products grouped by category
    const categories = await Category.find({ active: true }).limit(15).lean();
    console.log(`Found ${categories.length} categories\n`);

    // Get products per category (at least 2 products per category)
    const productsByCategory = {};
    for (const category of categories) {
      const products = await Product.find({
        category_id: category._id,
        active: true
      }).limit(3).lean();
      
      if (products.length > 0) {
        productsByCategory[category._id.toString()] = products;
      }
    }

    const totalProducts = Object.values(productsByCategory).flat().length;
    console.log(`Found ${totalProducts} products across ${Object.keys(productsByCategory).length} categories\n`);

    if (totalProducts < 10) {
      throw new Error(`Not enough products found. Need at least 10 products across different categories. Found: ${totalProducts}`);
    }

    // Get a superadmin user for workflow
    const superAdmin = await User.findOne({ username: "superadmin" }).lean();
    if (!superAdmin) {
      throw new Error("Superadmin user not found");
    }

    // Get or create a default facility/depot
    let defaultFacility = await Facility.findOne({ facility_type: "depot", active: true }).lean();
    if (!defaultFacility) {
      console.log("Creating default depot...");
      defaultFacility = await Facility.create({
        facility_name: "Default Depot",
        facility_type: "depot",
        facility_code: "DEP-001",
        active: true,
        address: "Dhaka, Bangladesh"
      });
    }
    console.log(`Using facility: ${defaultFacility.facility_name} (${defaultFacility._id})\n`);

    console.log("📝 Step 2: Creating Demand Orders...\n");

    // Common products for FIFO testing (use first 5 products)
    const allProducts = Object.values(productsByCategory).flat();
    const commonProducts = allProducts.slice(0, 5);

    let orderCount = 0;
    let chalanCount = 0;
    let stockEntriesCount = 0;

    for (const distributor of distributors) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Distributor: ${distributor.name} (${distributor.distributor_id})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Create 2 DOs per distributor
      for (let doNum = 1; doNum <= 2; doNum++) {
        console.log(`  📄 Creating DO #${doNum}...`);

        // Select products for this DO
        let doProducts = [];
        
        // Include common products in both DOs (for FIFO testing)
        if (commonProducts.length >= 5) {
          doProducts.push(...commonProducts);
        }

        // Add more products to reach at least 10
        const additionalProducts = allProducts.filter(p => 
          !commonProducts.find(cp => cp.sku === p.sku)
        ).slice(0, 10);
        
        doProducts.push(...additionalProducts);
        doProducts = doProducts.slice(0, 15); // Max 15 products per DO

        // Build DO items with varying prices for FIFO
        const items = doProducts.map((product, index) => {
          // Vary price for common products in DO #2 (for FIFO testing)
          const isCommonProduct = commonProducts.find(cp => cp.sku === product.sku);
          let unitPrice = product.dp_price || 100;
          
          if (doNum === 2 && isCommonProduct) {
            // Increase price by 10-20% for second DO
            unitPrice = unitPrice * (1 + (Math.random() * 0.1 + 0.1));
          }

          const quantity = 100 + Math.floor(Math.random() * 100); // 100-200 units
          
          return {
            source: "product",
            source_id: product._id,
            source_ref: "Product",
            sku: product.sku,
            quantity: quantity,
            unit_price: parseFloat(unitPrice.toFixed(2)),
            subtotal: parseFloat((quantity * unitPrice).toFixed(2)),
            product_details: {
              short_description: product.short_description,
              category: product.category_id?.toString(),
              brand: product.brand_id?.toString(),
              unit_per_case: product.unit_per_case || 1
            }
          };
        });

        const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

        // Create DO
        const demandOrder = await DemandOrder.create({
          distributor_id: distributor._id,
          status: "draft",
          items: items,
          total_amount: totalAmount,
          item_count: items.reduce((sum, item) => sum + item.quantity, 0),
          created_by: superAdmin._id,
          notes: `Test DO #${doNum} for ${distributor.name} - includes ${doProducts.length} products`
        });

        console.log(`    ✅ Created DO: ${demandOrder.order_number}`);
        console.log(`       Products: ${items.length}, Total Qty: ${demandOrder.item_count}, Amount: ${totalAmount.toFixed(2)}`);

        // Submit the order
        demandOrder.status = "submitted";
        demandOrder.submitted_at = new Date();
        await demandOrder.save();
        console.log(`    ✅ Submitted DO`);

        // Approve the order (simulating workflow)
        demandOrder.status = "approved";
        demandOrder.approved_at = new Date();
        demandOrder.approved_by = superAdmin._id;
        demandOrder.approval_history = [
          {
            action: "submit",
            performed_by: superAdmin._id,
            performed_by_name: "System",
            performed_by_role: "Admin",
            from_status: "draft",
            to_status: "submitted",
            timestamp: demandOrder.submitted_at
          },
          {
            action: "approve",
            performed_by: superAdmin._id,
            performed_by_name: "System",
            performed_by_role: "Admin",
            from_status: "submitted",
            to_status: "approved",
            timestamp: demandOrder.approved_at,
            comments: "Auto-approved for testing"
          }
        ];
        await demandOrder.save();
        console.log(`    ✅ Approved DO\n`);

        // Create Delivery Chalan
        const chalanNo = `CH-${Date.now()}-${orderCount.toString().padStart(3, '0')}`;
        const chalanItems = items.map(item => ({
          sku: item.sku,
          product_name: item.product_details?.short_description || item.sku,
          ordered_qty_ctn: Math.floor(item.quantity / (item.product_details.unit_per_case || 1)),
          ordered_qty_pcs: item.quantity,
          delivered_qty_ctn: Math.floor(item.quantity / (item.product_details.unit_per_case || 1)),
          delivered_qty_pcs: item.quantity,
          received_qty_ctn: Math.floor(item.quantity / (item.product_details.unit_per_case || 1)),
          received_qty_pcs: item.quantity,
          unit_price: item.unit_price,
          damage_qty_pcs: 0
        }));

        const chalan = await DeliveryChalan.create({
          chalan_no: chalanNo,
          order_id: demandOrder._id,
          order_number: demandOrder.order_number,
          distributor_id: distributor._id,
          facility_id: defaultFacility._id,
          items: chalanItems,
          status: "Received",
          generated_at: new Date(),
          received_at: new Date(),
          received_by: superAdmin._id,
          created_by: superAdmin._id
        });

        console.log(`    📋 Created Chalan: ${chalan.chalan_no}`);
        console.log(`    ✅ Received Chalan\n`);

        // Add stock to distributor using FIFO
        for (const item of items) {
          const batchId = `${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}-${Math.random().toString(36).substring(7)}`;
          
          // Find or create stock record
          let stockRecord = await DistributorStock.findOne({
            distributor_id: distributor._id,
            sku: item.sku
          });

          if (stockRecord) {
            // Add new batch to existing stock
            stockRecord.batches.push({
              batch_id: batchId,
              qty: item.quantity,
              unit_price: item.unit_price,
              received_at: new Date(),
              chalan_id: chalan._id,
              chalan_no: chalan.chalan_no
            });
            stockRecord.qty = stockRecord.batches.reduce((sum, batch) => sum + parseFloat(batch.qty.toString()), 0);
            stockRecord.last_received_at = new Date();
            stockRecord.last_chalan_id = chalan._id;
            await stockRecord.save();
          } else {
            // Create new stock record
            stockRecord = await DistributorStock.create({
              distributor_id: distributor._id,
              sku: item.sku,
              qty: item.quantity,
              batches: [{
                batch_id: batchId,
                qty: item.quantity,
                unit_price: item.unit_price,
                received_at: new Date(),
                chalan_id: chalan._id,
                chalan_no: chalan.chalan_no
              }],
              last_received_at: new Date(),
              last_chalan_id: chalan._id
            });
          }
          
          stockEntriesCount++;
        }

        console.log(`    📦 Added ${items.length} products to distributor stock with FIFO batches\n`);

        orderCount++;
        chalanCount++;
      }

      console.log(`  ✅ Completed ${distributor.distributor_id}: 2 DOs created, approved, and received\n`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All demand orders created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Summary:");
    console.log(`  - ${distributors.length} Distributors processed`);
    console.log(`  - ${orderCount} Demand Orders created`);
    console.log(`  - ${chalanCount} Delivery Chalans created and received`);
    console.log(`  - ${stockEntriesCount} Stock entries created with FIFO batches`);

    console.log("\n🎯 FIFO Testing Setup:");
    console.log(`  - Common products: ${commonProducts.length} products appear in both DOs`);
    console.log(`  - DO #1: Original prices`);
    console.log(`  - DO #2: Prices increased by 10-20% for common products`);
    console.log(`  - Each DO has 100-200 units per product`);

    console.log("\n📦 Stock Status Sample:");
    const sampleStock = await DistributorStock.findOne({ 
      distributor_id: distributors[0]._id 
    }).lean();
    
    if (sampleStock) {
      console.log(`  Distributor: ${distributors[0].name}`);
      console.log(`  SKU: ${sampleStock.sku}`);
      console.log(`  Total Qty: ${sampleStock.qty}`);
      console.log(`  Batches: ${sampleStock.batches.length}`);
      sampleStock.batches.forEach((batch, idx) => {
        console.log(`    Batch ${idx + 1}: ${batch.qty} units @ ${batch.unit_price} each (${batch.chalan_no})`);
      });
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
createDemandOrdersWithInventory();
