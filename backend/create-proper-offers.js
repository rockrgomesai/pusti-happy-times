const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    const db = mongoose.connection.db;

    // First, delete existing offers for distbanana
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

    // Delete old offers
    await db.collection("offers").deleteMany({ "distributors.ids": distributor._id });
    console.log("Deleted old offers");

    // Get some products for the offers
    const products = await db.collection("products").find({}).limit(20).toArray();
    console.log(`Found ${products.length} products`);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // Valid for 30 days

    // Create offers matching the actual Offer model schema
    const offers = [
      {
        name: "Buy 10 Get 2 Free - Premium Products",
        offer_type: "FREE_PRODUCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(0, 3).map((p) => p._id),
          applyToAllProducts: false,
          buyProducts: products.slice(0, 3).map((p) => ({
            productId: p._id,
            quantity: 10,
          })),
          getProducts: products.slice(0, 3).map((p) => ({
            productId: p._id,
            quantity: 2,
            discountPercentage: 100,
          })),
        },
        description: "Buy 10 cartons and get 2 free",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "5% Discount on Bulk Purchase",
        offer_type: "FLAT_DISCOUNT_PCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(3, 6).map((p) => p._id),
          applyToAllProducts: false,
          discountPercentage: 5,
          minOrderValue: 0,
        },
        description: "5% discount on bulk purchase (20+ cartons)",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "Flat ৳500 Off on Orders Above 50 Cartons",
        offer_type: "FLAT_DISCOUNT_AMT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(6, 9).map((p) => p._id),
          applyToAllProducts: false,
          discountAmount: 500,
          minOrderValue: 0,
        },
        description: "Flat ৳500 off on orders above 50 cartons",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "Buy 5 Get 1 Free - Special Deal",
        offer_type: "FREE_PRODUCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(9, 11).map((p) => p._id),
          applyToAllProducts: false,
          buyProducts: products.slice(9, 11).map((p) => ({
            productId: p._id,
            quantity: 5,
          })),
          getProducts: products.slice(9, 11).map((p) => ({
            productId: p._id,
            quantity: 1,
            discountPercentage: 100,
          })),
        },
        description: "Buy 5 cartons and get 1 free",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "10% Discount - Festival Offer",
        offer_type: "FLAT_DISCOUNT_PCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(11, 13).map((p) => p._id),
          applyToAllProducts: false,
          discountPercentage: 10,
          minOrderValue: 0,
        },
        description: "10% discount on festival offer",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "Buy 20 Get 5 Free - Mega Deal",
        offer_type: "FREE_PRODUCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(0, 2).map((p) => p._id),
          applyToAllProducts: false,
          buyProducts: products.slice(0, 2).map((p) => ({
            productId: p._id,
            quantity: 20,
          })),
          getProducts: products.slice(0, 2).map((p) => ({
            productId: p._id,
            quantity: 5,
            discountPercentage: 100,
          })),
        },
        description: "Buy 20 cartons and get 5 free",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "Flat ৳200 Off on 25+ Cartons",
        offer_type: "FLAT_DISCOUNT_AMT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(2, 5).map((p) => p._id),
          applyToAllProducts: false,
          discountAmount: 200,
          minOrderValue: 0,
        },
        description: "Flat ৳200 off on 25+ cartons",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "3% Discount - Early Bird Offer",
        offer_type: "FLAT_DISCOUNT_PCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(5, 8).map((p) => p._id),
          applyToAllProducts: false,
          discountPercentage: 3,
          minOrderValue: 0,
        },
        description: "3% discount for early bird buyers",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "Buy 15 Get 3 Free - Value Pack",
        offer_type: "FREE_PRODUCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(8, 10).map((p) => p._id),
          applyToAllProducts: false,
          buyProducts: products.slice(8, 10).map((p) => ({
            productId: p._id,
            quantity: 15,
          })),
          getProducts: products.slice(8, 10).map((p) => ({
            productId: p._id,
            quantity: 3,
            discountPercentage: 100,
          })),
        },
        description: "Buy 15 cartons and get 3 free",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "Flat ৳1000 Off on 100+ Cartons",
        offer_type: "FLAT_DISCOUNT_AMT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(10, 14).map((p) => p._id),
          applyToAllProducts: false,
          discountAmount: 1000,
          minOrderValue: 0,
        },
        description: "Flat ৳1000 off on orders of 100+ cartons",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "7% Discount - Weekend Special",
        offer_type: "FLAT_DISCOUNT_PCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(14, 16).map((p) => p._id),
          applyToAllProducts: false,
          discountPercentage: 7,
          minOrderValue: 0,
        },
        description: "7% weekend special discount",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "Buy 8 Get 2 Free - Quick Deal",
        offer_type: "FREE_PRODUCT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(16, 18).map((p) => p._id),
          applyToAllProducts: false,
          buyProducts: products.slice(16, 18).map((p) => ({
            productId: p._id,
            quantity: 8,
          })),
          getProducts: products.slice(16, 18).map((p) => ({
            productId: p._id,
            quantity: 2,
            discountPercentage: 100,
          })),
        },
        description: "Buy 8 cartons and get 2 free",
        created_by: user._id,
        updated_by: user._id,
      },
      {
        name: "Flat ৳350 Off on 40+ Cartons",
        offer_type: "FLAT_DISCOUNT_AMT",
        product_segments: [distributor.product_segment[0]],
        start_date: now,
        end_date: futureDate,
        status: "active",
        active: true,
        distributors: {
          ids: [distributor._id],
          mode: "include",
        },
        config: {
          selectedProducts: products.slice(18, 20).map((p) => p._id),
          applyToAllProducts: false,
          discountAmount: 350,
          minOrderValue: 0,
        },
        description: "Flat ৳350 off on 40+ cartons",
        created_by: user._id,
        updated_by: user._id,
      },
    ];

    // Insert offers
    const result = await db.collection("offers").insertMany(offers);
    console.log(`\nCreated ${result.insertedCount} offers for distbanana`);

    // Show summary
    offers.forEach((offer, idx) => {
      console.log(`${idx + 1}. ${offer.name} (${offer.offer_type})`);
    });

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
