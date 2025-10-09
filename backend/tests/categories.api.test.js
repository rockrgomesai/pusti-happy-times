const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server-core');

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { username: 'test-user', email: 'test@example.com' };
    next();
  },
  requireApiPermission: () => (_req, _res, next) => next(),
}));

const categoriesRouter = require('../src/routes/categories');
const { Category } = require('../src/models');

const buildTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/categories', categoriesRouter);
  return app;
};

describe('Categories API integration', () => {
  let mongo;
  let app;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
    app = buildTestApp();
  });

  afterEach(async () => {
    await Category.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongo) {
      await mongo.stop();
    }
  });

  it('creates, updates, fetches and deletes categories with segment inheritance', async () => {
    const createRootRes = await request(app)
      .post('/categories')
      .send({ name: 'Root', product_segment: 'BIS', active: true });

    expect(createRootRes.status).toBe(201);
    expect(createRootRes.body.success).toBe(true);
    const rootId = createRootRes.body.data._id;
    expect(createRootRes.body.data.product_segment).toBe('BIS');

    const createChildRes = await request(app)
      .post('/categories')
      .send({ name: 'Child', parent_id: rootId, product_segment: 'BEV' });

    expect(createChildRes.status).toBe(201);
    expect(createChildRes.body.data.parent_id).toBe(rootId);
    expect(createChildRes.body.data.product_segment).toBe('BIS');

    const listRes = await request(app).get('/categories');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(2);

    const updateRootRes = await request(app)
      .put(`/categories/${rootId}`)
      .send({ product_segment: 'BEV' });

    expect(updateRootRes.status).toBe(200);
    expect(updateRootRes.body.data.product_segment).toBe('BEV');

    const childDoc = await Category.findOne({ name: 'Child' }).lean();
    expect(childDoc.product_segment).toBe('BEV');

    const deleteRootRes = await request(app).delete(`/categories/${rootId}`);
    expect(deleteRootRes.status).toBe(200);
    expect(deleteRootRes.body.success).toBe(true);
    expect(deleteRootRes.body.data.reassignedChildren).toBeGreaterThanOrEqual(1);

    const orphan = await Category.findOne({ name: 'Child' }).lean();
    expect(orphan).toBeTruthy();
    expect(orphan.parent_id).toBeNull();
    expect(orphan.product_segment).toBe('BEV');
  });

  it('rejects invalid root payload lacking product segment', async () => {
    const res = await request(app)
      .post('/categories')
      .send({ name: 'NoSegment' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors?.[0]?.msg).toBe('Product segment is required for root categories');
  });
});
