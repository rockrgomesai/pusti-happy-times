---
mode: agent
description: Redesign SalesModuleScreen.tsx — two-zone layout with a manual offers carousel (Zone 1) and a category accordion with FIFO batch sub-rows (Zone 2). Includes backend catalog extension for fifo_batches. No dependency on other P-prompts.
---

# P9 — Sales Order Screen Redesign (SalesModuleScreen)

## Context

- Read [COMMON-SESSION-HANDOVER.md](../../COMMON-SESSION-HANDOVER.md) sections 2 and 3 first.
- Files to modify:
  - `backend/src/routes/mobile/catalog.js` — expose FIFO batch data in `GET /products`
  - `mobile/src/services/salesAPI.ts` — extend interfaces for `batch_id` and FIFO
  - `mobile/src/screens/SalesModuleScreen.tsx` — full layout restructure
- No dependency on other P-prompts. Backend and mobile changes can be done in the order listed.

---

## Step 1 — Backend: Extend `GET /mobile/catalog/products`

File: `backend/src/routes/mobile/catalog.js`

Find the handler for `GET /products`. The relevant section currently does:
```js
const distributorStock = await DistributorStock.find({ distributor_id, active: true })
  .select("sku qty")
  .lean();
```

**Change the select** to include `batches`:
```js
const distributorStock = await DistributorStock.find({ distributor_id, active: true })
  .select("sku qty batches")
  .lean();
```

Build a stockMap that exposes FIFO batch details. **Replace** the existing stockMap line:
```js
// OLD (remove this):
const stockMap = new Map(distributorStock.map(s => [s.sku, s.qty]));

// NEW:
const stockMap = new Map(
  distributorStock.map(s => {
    const fifo_batches = (s.batches || [])
      .filter(b => parseFloat(b.qty?.toString() || "0") > 0)
      .sort((a, b) => new Date(a.received_at) - new Date(b.received_at))
      .map(b => ({
        batch_id:      b.batch_id?.toString(),
        available_pcs: parseFloat(b.qty?.toString() || "0"),
        unit_price:    parseFloat(b.unit_price?.toString() || "0"),
        received_at:   b.received_at,
      }));
    return [s.sku, { total_qty: parseFloat(s.qty?.toString() || "0"), fifo_batches }];
  })
);
```

In the products mapping section, change the stock lookup and add `ctn_pcs` + `fifo_batches`:
```js
// Ensure Product.select includes ctn_pcs — add it to the .select() chain:
//   .select("sku bangla_name english_name category_id unit_price ctn_pcs ...")

// When building the product response objects:
const stock = stockMap.get(product.sku);
return {
  ...product,
  available_qty:  stock?.total_qty ?? 0,
  fifo_batches:   stock?.fifo_batches ?? [],
};
```

---

## Step 2a — Mobile: Update Interfaces in `salesAPI.ts`

File: `mobile/src/services/salesAPI.ts`

Add the `FIFOBatch` interface and extend `Product` + `CartItem`:

```typescript
export interface FIFOBatch {
  batch_id:      string;
  available_pcs: number;
  unit_price:    number;
  received_at:   string;  // ISO date string
}

// In the Product interface, add:
ctn_pcs?:     number;
fifo_batches: FIFOBatch[];

// In CartItem, add:
batch_id: string;
```

Update `addToCart` signature throughout `salesAPI.ts` — everywhere a `CartItem` is built or updated, include `batch_id`. The cart storage key in `saveCart` / `loadCart` is now `${product_id}_${batch_id}` when keying the cart Map internally (see SalesModuleScreen changes below).

---

## Step 2b — Mobile: Rewrite `SalesModuleScreen.tsx`

File: `mobile/src/screens/SalesModuleScreen.tsx`

### Preserve unchanged

- `handleSubmitOrder()` — keep exactly as-is.
- `placeOrder()` call signature and offline queue fallback (`@pending_orders_v1`).
- Auth token + `distributor_id` extraction from `AsyncStorage`.

### New types (add at top of file, after imports)

```typescript
type AccordionRowType = 'header' | 'loading' | 'product';

interface AccordionRow {
  type:        AccordionRowType;
  id:          string;        // unique key for FlatList
  categoryId?: string;
  categoryName?: string;
  productId?:  string;
  product?:    Product;
  batchIndex?: number;        // index in fifo_batches[]
  batch?:      FIFOBatch;
}
```

### New state (replace old state)

```typescript
// ── Category accordion state ──────────────────────────────────
const [categories,        setCategories]        = useState<Category[]>([]);
const [expandedCategories,setExpandedCategories] = useState<Set<string>>(new Set());
const [categoryProducts,  setCategoryProducts]   = useState<Map<string, Product[]>>(new Map());
const [loadingCategories, setLoadingCategories]  = useState<Set<string>>(new Set());

// ── Offers carousel ───────────────────────────────────────────
const [offers,      setOffers]      = useState<Offer[]>([]);
const [offerIndex,  setOfferIndex]  = useState(0);

// ── Language toggle ───────────────────────────────────────────
const [language, setLanguage] = useState<'bn' | 'en'>('bn');

// ── Cart ──────────────────────────────────────────────────────
// Cart key: `${product_id}_${batch_id}`
const [cart, setCart] = useState<Map<string, CartItem>>(new Map());

// ── App state ─────────────────────────────────────────────────
const [submitting, setSubmitting] = useState(false);
```

### loadData (on mount)

```typescript
const loadData = async () => {
  const token = await AsyncStorage.getItem('@auth_token');
  const distId = await AsyncStorage.getItem('@distributor_id');
  const savedLang = await AsyncStorage.getItem('@lang_pref') as 'bn' | 'en' | null;
  if (savedLang) setLanguage(savedLang);

  const [cats, ofrs, savedCart] = await Promise.all([
    salesAPI.getCategories(token!, distId!),
    salesAPI.getOffers(token!, distId!),
    salesAPI.loadCart(),
  ]);
  setCategories(cats);
  setOffers(ofrs);
  if (savedCart.size > 0) setCart(savedCart);
};

useEffect(() => { loadData(); }, []);
```

### Language toggle helper

```typescript
const productName = (p: Product) =>
  language === 'bn' ? p.bangla_name : p.english_name;

const toggleLanguage = async () => {
  const next: 'bn' | 'en' = language === 'bn' ? 'en' : 'bn';
  setLanguage(next);
  await AsyncStorage.setItem('@lang_pref', next);
};
```

### Category expand / collapse

```typescript
const handleCategoryToggle = async (categoryId: string) => {
  const next = new Set(expandedCategories);
  if (next.has(categoryId)) {
    next.delete(categoryId);
    setExpandedCategories(next);
    return;
  }
  next.add(categoryId);
  setExpandedCategories(next);

  if (categoryProducts.has(categoryId)) return;   // already loaded

  setLoadingCategories(prev => new Set(prev).add(categoryId));
  try {
    const token  = await AsyncStorage.getItem('@auth_token');
    const distId = await AsyncStorage.getItem('@distributor_id');
    const products = await salesAPI.getProducts(token!, distId!, categoryId);
    setCategoryProducts(prev => new Map(prev).set(categoryId, products));
  } finally {
    setLoadingCategories(prev => {
      const s = new Set(prev); s.delete(categoryId); return s;
    });
  }
};
```

### addToCart

```typescript
const addToCart = (product: Product, batch: FIFOBatch, qty: number) => {
  const key = `${product._id}_${batch.batch_id}`;
  setCart(prev => {
    const next = new Map(prev);
    if (qty <= 0) {
      next.delete(key);
    } else {
      next.set(key, {
        product_id:  product._id,
        batch_id:    batch.batch_id,
        sku:         product.sku,
        bangla_name: product.bangla_name,
        english_name: product.english_name,
        quantity:    qty,
        unit_price:  batch.unit_price,
        subtotal:    qty * batch.unit_price,
      });
    }
    salesAPI.saveCart(next);
    return next;
  });
};
```

### accordionData (useMemo)

```typescript
const accordionData = useMemo<AccordionRow[]>(() => {
  const rows: AccordionRow[] = [];
  for (const cat of categories) {
    // Header row
    rows.push({
      type:         'header',
      id:           `h_${cat._id}`,
      categoryId:   cat._id,
      categoryName: cat.name,
    });
    if (!expandedCategories.has(cat._id)) continue;

    // Loading placeholder
    if (loadingCategories.has(cat._id)) {
      rows.push({ type: 'loading', id: `l_${cat._id}`, categoryId: cat._id });
      continue;
    }

    // Product + batch rows
    const products = categoryProducts.get(cat._id) || [];
    for (const product of products) {
      const batches = product.fifo_batches || [];
      if (batches.length === 0) {
        // Product with no stock: single row, qty indicator zero
        rows.push({ type: 'product', id: `p_${product._id}_no_stock`, product, batchIndex: -1 });
        continue;
      }
      for (let bi = 0; bi < batches.length; bi++) {
        rows.push({
          type:       'product',
          id:         `p_${product._id}_b${bi}`,
          product,
          batchIndex: bi,
          batch:      batches[bi],
        });
      }
    }
  }
  return rows;
}, [categories, expandedCategories, loadingCategories, categoryProducts]);
```

### FIFO batch ordering gate

Batch row at index `bi` is **locked** (dimmed, qty input disabled) when:
```typescript
const isBatchLocked = (product: Product, batchIndex: number): boolean => {
  if (batchIndex === 0) return false;
  const prevBatch = product.fifo_batches[batchIndex - 1];
  const prevKey   = `${product._id}_${prevBatch.batch_id}`;
  const prevInCart = cart.get(prevKey)?.quantity ?? 0;
  return prevInCart < prevBatch.available_pcs;
};
```

### Screen layout

```tsx
<SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
  {/* Header */}
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <MaterialIcons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Sales Order</Text>
    <TouchableOpacity onPress={toggleLanguage} style={styles.langToggle}>
      <Text style={styles.langToggleText}>{language === 'bn' ? 'EN' : 'বাং'}</Text>
    </TouchableOpacity>
  </View>

  {/* Zone 1 — Offers carousel (~160px, hidden if empty) */}
  {offers.length > 0 && (
    <View style={styles.carouselZone}>
      <TouchableOpacity
        onPress={() => setOfferIndex(i => Math.max(0, i - 1))}
        disabled={offerIndex === 0}
        style={[styles.carouselArrow, offerIndex === 0 && styles.arrowDisabled]}>
        <MaterialIcons name="chevron-left" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={styles.carouselCard}>
        <Text style={styles.offerTitle}>{offers[offerIndex]?.title}</Text>
        <Text style={styles.offerBody}>{offers[offerIndex]?.description}</Text>
      </View>

      <TouchableOpacity
        onPress={() => setOfferIndex(i => Math.min(offers.length - 1, i + 1))}
        disabled={offerIndex === offers.length - 1}
        style={[styles.carouselArrow, offerIndex === offers.length - 1 && styles.arrowDisabled]}>
        <MaterialIcons name="chevron-right" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Dot indicators */}
      <View style={styles.dotRow}>
        {offers.map((_, i) => (
          <View key={i} style={[styles.dot, i === offerIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  )}

  {/* Zone 2 — Category accordion */}
  <FlatList
    style={{ flex: 1 }}
    data={accordionData}
    keyExtractor={item => item.id}
    renderItem={({ item }) => {
      if (item.type === 'header') {
        const isOpen = expandedCategories.has(item.categoryId!);
        return (
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => handleCategoryToggle(item.categoryId!)}>
            <Text style={styles.categoryHeaderText}>{item.categoryName}</Text>
            <MaterialIcons
              name={isOpen ? 'expand-less' : 'expand-more'}
              size={24} color="#555" />
          </TouchableOpacity>
        );
      }
      if (item.type === 'loading') {
        return (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" />
            <Text style={{ marginLeft: 8, color: '#777' }}>Loading products…</Text>
          </View>
        );
      }
      // type === 'product'
      const { product, batch, batchIndex } = item;
      if (!product) return null;

      if (batchIndex === -1 || !batch) {
        // No-stock row
        return (
          <View style={[styles.productRow, styles.noStockRow]}>
            <Text style={styles.productName}>{productName(product)}</Text>
            <Text style={styles.noStockText}>Out of stock</Text>
          </View>
        );
      }

      const locked  = isBatchLocked(product, batchIndex!);
      const cartKey = `${product._id}_${batch.batch_id}`;
      const qtyInCart = cart.get(cartKey)?.quantity ?? 0;

      return (
        <View style={[styles.productRow, locked && styles.productRowLocked]}>
          <View style={{ flex: 1 }}>
            {batchIndex === 0 && (
              <Text style={styles.productName}>{productName(product)}</Text>
            )}
            <Text style={styles.batchLabel}>
              Batch {batchIndex! + 1} — {batch.available_pcs} pcs @ ৳{batch.unit_price.toFixed(2)}
            </Text>
          </View>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              disabled={locked || qtyInCart === 0}
              onPress={() => addToCart(product, batch, qtyInCart - 1)}>
              <MaterialIcons name="remove-circle-outline" size={28}
                color={locked || qtyInCart === 0 ? '#ccc' : '#e53935'} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qtyInCart}</Text>
            <TouchableOpacity
              disabled={locked || qtyInCart >= batch.available_pcs}
              onPress={() => addToCart(product, batch, qtyInCart + 1)}>
              <MaterialIcons name="add-circle-outline" size={28}
                color={locked || qtyInCart >= batch.available_pcs ? '#ccc' : '#43a047'} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }}
  />

  {/* Submit bar */}
  {cart.size > 0 && (
    <View style={styles.submitBar}>
      <Text style={styles.submitCartSummary}>
        {cart.size} line(s) — ৳
        {[...cart.values()].reduce((s, i) => s + i.subtotal, 0).toFixed(2)}
      </Text>
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmitOrder}
        disabled={submitting}>
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitButtonText}>Submit Order</Text>}
      </TouchableOpacity>
    </View>
  )}
</SafeAreaView>
```

### StyleSheet additions

Add at minimum:
```typescript
carouselZone:     { height: 160, backgroundColor: '#1565c0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, position: 'relative' },
carouselCard:     { flex: 1, paddingHorizontal: 12 },
carouselArrow:    { padding: 4 },
arrowDisabled:    { opacity: 0.3 },
dotRow:           { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
dot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 3 },
dotActive:        { backgroundColor: '#fff' },
categoryHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#e0e0e0' },
categoryHeaderText: { fontSize: 15, fontWeight: '600', color: '#333' },
loadingRow:       { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fafafa' },
productRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
productRowLocked: { opacity: 0.4 },
noStockRow:       { backgroundColor: '#fafafa' },
batchLabel:       { fontSize: 12, color: '#666', marginTop: 2 },
langToggle:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#fff' },
langToggleText:   { color: '#fff', fontWeight: '600', fontSize: 13 },
```

---

## Rules

- **Do NOT** change `handleSubmitOrder()`, `placeOrder()`, or the offline queue (`@pending_orders_v1`).
- **Do NOT** mutate `DistributorStock.batches[]` directly — the catalog route is read-only here.
- `fifo_batches` in the API response is built server-side; never expose raw `batches[]` from DistributorStock to mobile.
- Cart key must be `${product_id}_${batch_id}` — not just `product_id`.
- The language preference key is `@lang_pref` (AsyncStorage).
- Category products are lazy-loaded on first expand and cached in the `categoryProducts` Map for the session lifetime.

## Verification

1. Screen opens → categories listed → offers carousel visible if offers exist, hidden if empty.
2. Tap a category → spinner → products with FIFO batch rows appear.
3. Batch 1 row: qty +/− works, cart updates in real-time.
4. Batch 2 row: dimmed until batch 1 qty reaches `available_pcs`.
5. After filling batch 1 fully, batch 2 becomes tappable.
6. Carousel left/right arrows advance; left disabled on index 0; right disabled on last offer; dot indicators update.
7. Language toggle switches product names between Bangla and English; preference persists after screen reload.
8. Submit order with mixed batches of same product — two separate line items appear in order payload.
