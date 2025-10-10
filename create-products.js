// Create products collection with validation rules matching application schema

db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "product_type",
        "brand_id",
        "category_id",
        "sku",
        "trade_price",
        "unit",
        "wt_pcs",
        "active",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by"
      ],
      properties: {
        product_type: {
          bsonType: "string",
          enum: ["MANUFACTURED", "PROCURED"],
          description: "Product type must be MANUFACTURED or PROCURED"
        },
        brand_id: {
          bsonType: "objectId",
          description: "Reference to brands._id"
        },
        category_id: {
          bsonType: "objectId",
          description: "Reference to categories._id"
        },
        depot_ids: {
          bsonType: ["array"],
          description: "References to depots._id (required for manufactured products)",
          items: {
            bsonType: "objectId"
          }
        },
        sku: {
          bsonType: "string",
          minLength: 1,
          description: "Unique stock keeping unit"
        },
        trade_price: {
          bsonType: "double",
          minimum: 0,
          description: "Trade price must be >= 0"
        },
        db_price: {
          bsonType: ["double", "null"],
          minimum: 0,
          description: "Distributor price applies to manufactured products"
        },
        mrp: {
          bsonType: ["double", "null"],
          minimum: 0,
          description: "MRP applies to manufactured products"
        },
        ctn_pcs: {
          bsonType: ["double", "null"],
          minimum: 0,
          description: "Carton pieces applies to manufactured products"
        },
        wt_pcs: {
          bsonType: "double",
          minimum: 0,
          description: "Weight per piece must be >= 0"
        },
        unit: {
          bsonType: "string",
          enum: ["BAG", "BOX", "CASE", "CTN", "JAR", "POUCH", "PCS"],
          description: "Unit must be one of the supported product units"
        },
        bangla_name: {
          bsonType: ["string", "null"],
          description: "Optional Bangla name for manufactured products"
        },
        erp_id: {
          bsonType: ["int", "null"],
          description: "Optional ERP identifier"
        },
        launch_date: {
          bsonType: ["date", "null"],
          description: "Launch date for manufactured products"
        },
        decommission_date: {
          bsonType: ["date", "null"],
          description: "Optional retirement date"
        },
        image_url: {
          bsonType: ["string", "null"],
          description: "Optional hero image"
        },
        active: {
          bsonType: "bool",
          description: "Soft delete flag"
        },
        created_at: {
          bsonType: "date",
          description: "Creation timestamp"
        },
        created_by: {
          bsonType: "string",
          minLength: 1,
          description: "Creator username or identifier"
        },
        updated_at: {
          bsonType: "date",
          description: "Last update timestamp"
        },
        updated_by: {
          bsonType: "string",
          minLength: 1,
          description: "Updater username or identifier"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
});

db.products.createIndex({ sku: 1 }, { unique: true, name: "ux_products_sku" });
db.products.createIndex({ bangla_name: 1 }, { unique: true, sparse: true, name: "ux_products_bn_name" });
db.products.createIndex({ product_type: 1, active: 1 }, { name: "ix_products_type_active" });
db.products.createIndex({ brand_id: 1, category_id: 1, active: 1 }, { name: "ix_products_brand_category_active" });
db.products.createIndex({ sku: "text", bangla_name: "text" }, { name: "ix_products_text_search" });
db.products.createIndex({ depot_ids: 1 }, { name: "ix_products_depot_ids" });

db.products.createIndex({ created_at: -1 }, { name: "ix_products_created_at" });

print("products collection created successfully with validators and indexes");
