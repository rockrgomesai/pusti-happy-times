const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server-core");

jest.mock("../src/middleware/auth", () => ({
  requireApiPermission: () => (_req, _res, next) => next(),
}));

const productRouter = require("../src/routes/product/products");
const { Product, Brand, Category, Depot } = require("../src/models");

const buildTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/product/products", productRouter);
  return app;
};

describe("Products API depot validation", () => {
  let mongo;
  let app;
  let brand;
  let category;
  let depot;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), {
      dbName: "products-api-tests",
    });

    app = buildTestApp();

    const systemUserId = new mongoose.Types.ObjectId();

    brand = await Brand.create({
      brand: "Route Brand",
      created_by: systemUserId,
      updated_by: systemUserId,
    });

    category = await Category.create({
      name: "Route Category",
      product_segment: "BIS",
      created_by: "tester",
      updated_by: "tester",
    });

    depot = await Depot.create({
      name: "Route Depot",
      created_by: systemUserId,
      updated_by: systemUserId,
    });
  });

  afterEach(async () => {
    await Product.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongo) {
      await mongo.stop();
    }
  });

  it("creates a manufactured product when depot_ids are provided", async () => {
    const response = await request(app)
      .post("/product/products")
      .send({
        product_type: "MANUFACTURED",
        brand_id: brand._id.toString(),
        category_id: category._id.toString(),
        depot_ids: [depot._id.toString()],
        sku: "ROUTE-MFG-001",
        unit: "BOX",
        trade_price: 150,
        db_price: 130,
        mrp: 180,
        wt_pcs: 10,
        ctn_pcs: 20,
        bangla_name: "রাউট পণ্য",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.depot_ids).toHaveLength(1);
    expect(response.body.data?.depot_ids?.[0]).toBe(depot._id.toString());
  });

  it("rejects manufactured payloads without depot_ids and references depots in the error", async () => {
    const response = await request(app)
      .post("/product/products")
      .send({
        product_type: "MANUFACTURED",
        brand_id: brand._id.toString(),
        category_id: category._id.toString(),
        depot_ids: [],
        sku: "ROUTE-MFG-002",
        unit: "BOX",
        trade_price: 150,
        db_price: 130,
        mrp: 180,
        wt_pcs: 10,
        ctn_pcs: 20,
        bangla_name: "রাউট পণ্য",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "At least one depot is required for MANUFACTURED products"
    );
  });
});