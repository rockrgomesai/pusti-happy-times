const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    const db = mongoose.connection.db;

    // Get distbanana user and distributor
    const user = await db.collection("users").findOne({ username: "distbanana" });
    if (!user || !user.distributor_id) {
      console.error("distbanana user or distributor_id not found");
      process.exit(1);
    }

    const distributor = await db.collection("distributors").findOne({ _id: user.distributor_id });
    if (!distributor) {
      console.error("Distributor not found");
      process.exit(1);
    }

    // Get a depot_id from depot_stocks
    const depotStock = await db.collection("depot_stocks").findOne({});
    if (!depotStock || !depotStock.depot_id) {
      console.error("No depot_stocks found with depot_id");
      process.exit(1);
    }

    const depotId = depotStock.depot_id;

    console.log("Distributor:", {
      name: distributor.name,
      distributor_id: distributor._id,
      segment: distributor.product_segment[0],
      depot_id: depotId,
    });

    // Get some products for the offers
    const products = await db.collection("products").find({}).limit(20).toArray();
    console.log(`Found ${products.length} products`);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // Valid for 30 days

    // Create 13 diverse offers
    const offers = [
      {
        offer_name: "Buy 10 Get 2 Free - Premium Products",
        offer_type: "quantity_based",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(0, 3).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 10,
        free_quantity: 2,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "5% Discount on Bulk Purchase",
        offer_type: "percentage_discount",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(3, 6).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 20,
        discount_percentage: 5,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "Flat ৳500 Off on Orders Above 50 Cartons",
        offer_type: "flat_discount",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(6, 9).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 50,
        discount_amount: 500,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "Buy 5 Get 1 Free - Special Deal",
        offer_type: "quantity_based",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(9, 11).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 5,
        free_quantity: 1,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "10% Discount - Festival Offer",
        offer_type: "percentage_discount",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(11, 13).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 15,
        discount_percentage: 10,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "Buy 20 Get 5 Free - Mega Deal",
        offer_type: "quantity_based",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(0, 2).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 20,
        free_quantity: 5,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "Flat ৳200 Off on 25+ Cartons",
        offer_type: "flat_discount",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(2, 5).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 25,
        discount_amount: 200,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "3% Discount - Early Bird Offer",
        offer_type: "percentage_discount",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(5, 8).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 10,
        discount_percentage: 3,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "Buy 15 Get 3 Free - Value Pack",
        offer_type: "quantity_based",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(8, 10).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 15,
        free_quantity: 3,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "Flat ৳1000 Off on 100+ Cartons",
        offer_type: "flat_discount",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(10, 14).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 100,
        discount_amount: 1000,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "7% Discount - Weekend Special",
        offer_type: "percentage_discount",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(14, 16).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 30,
        discount_percentage: 7,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "Buy 8 Get 2 Free - Quick Deal",
        offer_type: "quantity_based",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(16, 18).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 8,
        free_quantity: 2,
        created_at: now,
        updated_at: now,
      },
      {
        offer_name: "Flat ৳350 Off on 40+ Cartons",
        offer_type: "flat_discount",
        segment: distributor.product_segment[0],
        depot_ids: [depotId],
        distributor_ids: [distributor._id],
        start_date: now,
        end_date: futureDate,
        is_active: true,
        products: products.slice(18, 20).map((p) => ({
          product_id: p._id,
          sku: p.sku,
          short_description: p.short_description,
          mrp: p.mrp,
          unit_per_case: p.unit_per_case,
        })),
        min_quantity: 40,
        discount_amount: 350,
        created_at: now,
        updated_at: now,
      },
    ];

    // Insert offers
    const result = await db.collection("offers").insertMany(offers);
    console.log(`\nCreated ${result.insertedCount} offers for distbanana`);

    // Show summary
    offers.forEach((offer, idx) => {
      console.log(
        `${idx + 1}. ${offer.offer_name} (${offer.offer_type}) - ${offer.products.length} products`
      );
    });

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
