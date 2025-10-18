# Offers Module - Quick Reference

## 🌐 Frontend Routes

| Route | Description |
|-------|-------------|
| `/product/offers/create` | Create new offer (5-screen wizard) |
| `/product/browseoffers` | Browse/manage all offers |
| `/product/offers/[id]` | View offer details (TODO) |
| `/product/offers/edit/[id]` | Edit offer (TODO) |

## 🔌 Backend API Endpoints

### Base URL: `http://localhost:5000/api/v1/product/offers`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **POST** | `/` | ✅ | Create offer |
| **GET** | `/` | ✅ | List offers (paginated) |
| **GET** | `/:id` | ✅ | Get single offer |
| **PUT** | `/:id` | ✅ | Update offer |
| **DELETE** | `/:id` | ✅ | Delete offer (soft) |
| **PATCH** | `/:id/status` | ✅ | Toggle active status |
| **POST** | `/:id/duplicate` | ✅ | Duplicate offer |
| **POST** | `/products/grouped-by-category` | ✅ | Get products by category |

## 📊 Query Parameters (GET /)

```
?page=1              # Page number (1-based)
&limit=25            # Items per page (10/25/50/100)
&status=active       # Filter: draft/active/paused/expired/completed
&offer_type=BOGO     # Filter by offer type
&active=true         # Filter active offers only
&search=summer       # Search in name and description
```

## 🎯 Test URLs

### Frontend
- Create: http://localhost:3001/product/offers/create
- Browse: http://localhost:3001/product/browseoffers

### Backend (use Postman/curl)
- List: http://localhost:5000/api/v1/product/offers?page=1&limit=25
- Get: http://localhost:5000/api/v1/product/offers/{id}

## 🔑 Required Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

## 📦 Sample Request Body (Create)

```json
{
  "name": "Summer Mega Sale",
  "offer_type": "FLAT_DISCOUNT_PCT",
  "product_segments": ["BIS", "BEV"],
  "start_date": "2025-10-20T00:00:00.000Z",
  "end_date": "2025-11-20T00:00:00.000Z",
  "status": "draft",
  "active": false,
  "territories": {
    "zones": {
      "ids": ["zone_id_1", "zone_id_2"],
      "mode": "include"
    },
    "regions": {
      "ids": [],
      "mode": "include"
    },
    "areas": {
      "ids": [],
      "mode": "include"
    },
    "db_points": {
      "ids": ["dbpoint_id_1"],
      "mode": "include"
    }
  },
  "distributors": {
    "ids": ["dist_id_1", "dist_id_2"],
    "mode": "include"
  },
  "config": {
    "selectedProducts": ["prod_id_1", "prod_id_2"],
    "applyToAllProducts": false,
    "discountPercentage": 15,
    "minOrderValue": 5000,
    "maxDiscountAmount": 1000
  },
  "description": "Special summer discount for all distributors",
  "internal_notes": "Approved by sales manager"
}
```

## 🎨 13 Offer Types

1. **FLAT_DISCOUNT_PCT** - Flat % discount
2. **FLAT_DISCOUNT_AMT** - Flat amount discount
3. **DISCOUNT_SLAB_PCT** - Tiered % discount
4. **DISCOUNT_SLAB_AMT** - Tiered amount discount
5. **FREE_PRODUCT** - Free product with purchase
6. **BUNDLE_OFFER** - Bundle discount
7. **BOGO** - Buy one get one
8. **CASHBACK** - Cashback offer
9. **VOLUME_DISCOUNT** - Volume-based discount
10. **CROSS_CATEGORY** - Cross-category discount
11. **FIRST_ORDER** - First order discount
12. **LOYALTY_POINTS** - Earn loyalty points
13. **FLASH_SALE** - Limited time/stock flash sale

## 🎭 Offer Status

- **draft** - Not yet active, being prepared
- **active** - Currently running
- **paused** - Temporarily disabled
- **expired** - End date passed
- **completed** - Finished or deleted

## 🧪 Quick Test Steps

1. **Login** to get access token
2. **Create** an offer via wizard
3. **Browse** offers at /product/browseoffers
4. **Filter** by status, type, or search
5. **Toggle** active/inactive status
6. **Duplicate** an offer
7. **Delete** an offer (soft delete)

## 🚨 Important Notes

- **Soft Delete**: Delete doesn't remove from DB, sets status to "completed"
- **Auto Status**: Deactivating sets status to "paused"
- **Permissions**: User needs offers:create, read, update, delete
- **Products**: Use SKU as product name (no name field in Product model)
- **Validation**: end_date must be after start_date

---

**Both servers running:**
- Backend: ✅ http://localhost:5000
- Frontend: ✅ http://localhost:3001

**Ready to test!** 🎉
