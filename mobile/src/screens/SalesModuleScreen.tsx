/**
 * Sales Module Screen
 * Two-zone layout: manual offers carousel (Zone 1) + category accordion with FIFO batch rows (Zone 2)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import salesAPI, { Category, Product, Offer, CartItem, FIFOBatch } from '../services/salesAPI';
import { friendlyErrorMessage } from '../utils/logger';

interface Props {
  route: any;
  navigation: any;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AccordionRowType = 'header' | 'loading' | 'product';

interface AccordionRow {
  type: AccordionRowType;
  id: string;
  categoryId?: string;
  categoryName?: string;
  productId?: string;
  product?: Product;
  batchIndex?: number;
  batch?: FIFOBatch;
}

// ─────────────────────────────────────────────────────────────────────────────

const SalesModuleScreen: React.FC<Props> = ({ route, navigation }) => {
  const { outletId, outletName, distributorId, currentLocation } = route.params;

  // ── Category accordion state ──────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryProducts, setCategoryProducts] = useState<Map<string, Product[]>>(new Map());
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());

  // ── Offers carousel ───────────────────────────────────────────
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerIndex, setOfferIndex] = useState(0);

  // ── Language toggle ───────────────────────────────────────────
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');

  // ── Cart ──────────────────────────────────────────────────────
  // Cart key: `${product_id}_${batch_id}`
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());

  // ── App state ─────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // ── loadData ──────────────────────────────────────────────────
  const loadData = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const savedLang = (await AsyncStorage.getItem('@lang_pref')) as 'bn' | 'en' | null;
    if (savedLang) setLanguage(savedLang);

    const [cats, ofrs, savedCart] = await Promise.all([
      salesAPI.getCategories(token!, distributorId),
      salesAPI.getOffers(token!, distributorId),
      salesAPI.loadCart(),
    ]);
    setCategories(cats);
    setOffers(ofrs);
    if (savedCart.size > 0) setCart(savedCart);
  };

  useEffect(() => { loadData(); }, []);

  // ── Language helpers ──────────────────────────────────────────
  const productName = (p: Product) =>
    language === 'bn' ? p.bangla_name : p.english_name;

  const toggleLanguage = async () => {
    const next: 'bn' | 'en' = language === 'bn' ? 'en' : 'bn';
    setLanguage(next);
    await AsyncStorage.setItem('@lang_pref', next);
  };

  // ── Category expand / collapse ────────────────────────────────
  const handleCategoryToggle = async (categoryId: string) => {
    const next = new Set(expandedCategories);
    if (next.has(categoryId)) {
      next.delete(categoryId);
      setExpandedCategories(next);
      return;
    }
    next.add(categoryId);
    setExpandedCategories(next);

    if (categoryProducts.has(categoryId)) return; // already loaded

    setLoadingCategories(prev => new Set(prev).add(categoryId));
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const products = await salesAPI.getProducts(token!, distributorId, categoryId);
      setCategoryProducts(prev => new Map(prev).set(categoryId, products));
    } finally {
      setLoadingCategories(prev => {
        const s = new Set(prev); s.delete(categoryId); return s;
      });
    }
  };

  // ── addToCart ─────────────────────────────────────────────────
  const addToCart = (product: Product, batch: FIFOBatch, qty: number) => {
    const key = `${product._id}_${batch.batch_id}`;
    setCart(prev => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(key);
      } else {
        next.set(key, {
          product_id: product._id,
          batch_id: batch.batch_id,
          sku: product.sku,
          bangla_name: product.bangla_name,
          english_name: product.english_name,
          quantity: qty,
          unit_price: batch.unit_price,
          subtotal: qty * batch.unit_price,
        });
      }
      salesAPI.saveCart(next);
      return next;
    });
  };

  // ── accordionData (useMemo) ───────────────────────────────────
  const accordionData = useMemo<AccordionRow[]>(() => {
    const rows: AccordionRow[] = [];
    for (const cat of categories) {
      rows.push({
        type: 'header',
        id: `h_${cat._id}`,
        categoryId: cat._id,
        categoryName: cat.name,
      });
      if (!expandedCategories.has(cat._id)) continue;

      if (loadingCategories.has(cat._id)) {
        rows.push({ type: 'loading', id: `l_${cat._id}`, categoryId: cat._id });
        continue;
      }

      const products = categoryProducts.get(cat._id) || [];
      for (const product of products) {
        const batches = product.fifo_batches || [];
        if (batches.length === 0) {
          rows.push({ type: 'product', id: `p_${product._id}_no_stock`, product, batchIndex: -1 });
          continue;
        }
        for (let bi = 0; bi < batches.length; bi++) {
          rows.push({
            type: 'product',
            id: `p_${product._id}_b${bi}`,
            product,
            batchIndex: bi,
            batch: batches[bi],
          });
        }
      }
    }
    return rows;
  }, [categories, expandedCategories, loadingCategories, categoryProducts]);

  // ── FIFO batch ordering gate ──────────────────────────────────
  const isBatchLocked = (product: Product, batchIndex: number): boolean => {
    if (batchIndex === 0) return false;
    const prevBatch = product.fifo_batches[batchIndex - 1];
    const prevKey = `${product._id}_${prevBatch.batch_id}`;
    const prevInCart = cart.get(prevKey)?.quantity ?? 0;
    return prevInCart < prevBatch.available_pcs;
  };

  // ── calculateCartTotal ────────────────────────────────────────
  const calculateCartTotal = (): number =>
    [...cart.values()].reduce((s, i) => s + i.subtotal, 0);

  // ── handleSubmitOrder ─────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (cart.size === 0) {
      Alert.alert('Cart Empty', 'Please add items to cart first');
      return;
    }

    Alert.alert('Confirm Order', `Place order for ₹${calculateCartTotal()}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Place Order',
        onPress: async () => {
          try {
            setSubmitting(true);

            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const userJson = await AsyncStorage.getItem('user');
            const userId = userJson ? JSON.parse(userJson)?._id || JSON.parse(userJson)?.id : null;
            if (!userId) {
              Alert.alert('Error', 'Unable to identify logged-in user. Please log in again.');
              setSubmitting(false);
              return;
            }

            const orderData = {
              outlet_id: outletId,
              distributor_id: distributorId,
              dsr_id: userId,
              items: [...cart.values()].map((item) => ({
                product_id: item.product_id,
                sku: item.sku,
                batch_id: item.batch_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
              })),
              gps_location: {
                type: 'Point',
                coordinates: [currentLocation?.lng || 0, currentLocation?.lat || 0],
              },
            };

            const result = await salesAPI.placeOrder(orderData);

            // Clear cart
            await salesAPI.clearCart(outletId);
            setCart(new Map());

            if (result.queued) {
              // Offline path — order saved locally, will sync automatically.
              Alert.alert(
                'Saved Offline',
                'No network available. Your order has been saved and will sync automatically when you are back online.',
                [{ text: 'OK', onPress: () => navigation.navigate('MainApp', { screen: 'Home' }) }],
              );
            } else {
              Alert.alert('Success', `Order ${result.data.order_number} placed successfully`, [
                { text: 'OK', onPress: () => navigation.navigate('MainApp', { screen: 'Home' }) },
              ]);
            }
          } catch (error: any) {
            console.error('Submit order error:', error);

            if (error.code === 'INSUFFICIENT_STOCK') {
              Alert.alert('Stock Unavailable', friendlyErrorMessage(error, 'Some items are out of stock'), [
                { text: 'OK' },
              ]);
            } else {
              Alert.alert('Error', friendlyErrorMessage(error, 'Failed to place order'));
            }
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  // ── render ────────────────────────────────────────────────────
  return (
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
            <Text style={styles.offerTitle}>{offers[offerIndex]?.name}</Text>
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
                  size={24}
                  color="#555"
                />
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
            return (
              <View style={[styles.productRow, styles.noStockRow]}>
                <Text style={styles.productName}>{productName(product)}</Text>
                <Text style={styles.noStockText}>Out of stock</Text>
              </View>
            );
          }

          const locked = isBatchLocked(product, batchIndex!);
          const cartKey = `${product._id}_${batch.batch_id}`;
          const qtyInCart = cart.get(cartKey)?.quantity ?? 0;

          return (
            <View style={[styles.productRow, locked && styles.productRowLocked]}>
              <View style={{ flex: 1 }}>
                {batchIndex === 0 && (
                  <Text style={[styles.productName, !locked && { color: '#000' }]}>{productName(product)}</Text>
                )}
                <Text style={[styles.skuText, !locked && { color: '#000' }]}>SKU: {product.sku}</Text>
                <Text style={[styles.batchLabel, !locked && { color: '#000' }]}>
                  Batch {batchIndex! + 1} — {batch.available_pcs} pcs @ ৳{batch.unit_price.toFixed(2)}
                </Text>
              </View>
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  disabled={locked || qtyInCart === 0}
                  onPress={() => addToCart(product, batch, qtyInCart - 1)}>
                  <MaterialIcons
                    name="remove-circle-outline"
                    size={28}
                    color={locked || qtyInCart === 0 ? '#ccc' : '#e53935'}
                  />
                </TouchableOpacity>
                <TextInput
                  style={[styles.qtyInput, locked && styles.qtyInputLocked]}
                  keyboardType="number-pad"
                  value={qtyInCart === 0 ? '' : String(qtyInCart)}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  editable={!locked}
                  maxLength={5}
                  onChangeText={(text) => {
                    const parsed = parseInt(text, 10);
                    const qty = isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), batch.available_pcs);
                    addToCart(product, batch, qty);
                  }}
                />
                <TouchableOpacity
                  disabled={locked || qtyInCart >= batch.available_pcs}
                  onPress={() => addToCart(product, batch, qtyInCart + 1)}>
                  <MaterialIcons
                    name="add-circle-outline"
                    size={28}
                    color={locked || qtyInCart >= batch.available_pcs ? '#ccc' : '#43a047'}
                  />
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
              ? <ActivityIndicator color="#1565c0" />
              : <Text style={styles.submitButtonText}>Submit Order</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1565c0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  langToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  langToggleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  carouselZone: {
    height: 160,
    backgroundColor: '#1565c0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },
  carouselCard: {
    flex: 1,
    paddingHorizontal: 12,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  offerBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  carouselArrow: {
    padding: 4,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  dotRow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafafa',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  productRowLocked: {
    opacity: 0.4,
  },
  noStockRow: {
    backgroundColor: '#fafafa',
  },
  noStockText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  skuText: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
    marginBottom: 2,
  },
  batchLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  qtyInput: {
    fontSize: 15,
    fontWeight: 'bold',
    minWidth: 44,
    textAlign: 'center',
    color: '#333',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
  },
  qtyInputLocked: {
    backgroundColor: '#f0f0f0',
    color: '#aaa',
    borderColor: '#e0e0e0',
  },
  submitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1565c0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 8,
  },
  submitCartSummary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  submitButtonText: {
    color: '#1565c0',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default SalesModuleScreen;
