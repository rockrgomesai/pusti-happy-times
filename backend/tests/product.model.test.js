const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server-core");

const { Product, Brand, Category, Depot } = require("../src/models");

describe("Product model depot requirements", () => {
  let mongo;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri, {
      dbName: "products-tests",
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongo) {
      await mongo.stop();
    }
  });

  afterEach(async () => {
    const cleanup = [
      Product.deleteMany({}),
      Brand.deleteMany({}),
      Category.deleteMany({}),
      Depot.deleteMany({}),
    ];
    await Promise.all(cleanup);
  });

  const createBaselineDocuments = async () => {
    const systemUserId = new mongoose.Types.ObjectId();

    const brand = await Brand.create({
      brand: "Test Brand",
      created_by: systemUserId,
      updated_by: systemUserId,
    });

    const category = await Category.create({
      name: "Test Category",
      product_segment: "BIS",
      created_by: "tester",
      updated_by: "tester",
    });

    const depot = await Depot.create({
      name: "Dhaka Central",
      created_by: systemUserId,
      updated_by: systemUserId,
    });

    return { brand, category, depot, systemUserId };
  };

  it("saves manufactured products that include depot_ids", async () => {
    const { brand, category, depot } = await createBaselineDocuments();

    const product = await Product.create({
      product_type: "MANUFACTURED",
      brand_id: brand._id,
      category_id: category._id,
      depot_ids: [depot._id],
      sku: "TEST-MFG-001",
      trade_price: 120,
      unit: "BOX",
      wt_pcs: 12,
      db_price: 100,
      mrp: 140,
      ctn_pcs: 24,
      bangla_name: "টেস্ট প্রোডাক্ট",
      active: true,
      created_by: "tester",
      updated_by: "tester",
    });

    expect(product).toBeDefined();
    expect(product.depot_ids).toHaveLength(1);
    expect(product.depot_ids[0].toString()).toBe(depot._id.toString());
  });

  it("rejects manufactured products that omit depot_ids with depot-specific message", async () => {
    const { brand, category } = await createBaselineDocuments();

    await expect(
      Product.create({
        product_type: "MANUFACTURED",
        brand_id: brand._id,
        category_id: category._id,
        depot_ids: [],
        sku: "TEST-MFG-002",
        trade_price: 80,
        unit: "BOX",
        wt_pcs: 10,
        db_price: 70,
        mrp: 95,
        ctn_pcs: 20,
        bangla_name: "নতুন প্রোডাক্ট",
        active: true,
        created_by: "tester",
        updated_by: "tester",
      })
    ).rejects.toThrow("At least one depot is required for MANUFACTURED products");
  });
});