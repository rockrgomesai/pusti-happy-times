/**
 * Cart Screen
 * Shows regular cart items and computed offer/free items.
 * DSR can adjust quantities, clear the cart, and submit the order.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import salesAPI, { CartItem, Offer } from '../services/salesAPI';
import { friendlyErrorMessage } from '../utils/logger';

// ── Local types ───────────────────────────────────────────────────────────────

interface OfferCartItem {
  offer_id: string;
  offer_name: string;
  product_id: string;
  sku: string;
  english_name: string;
  quantity: number;
}

interface OfferNote {
  offer_id: string;
  text: string;
  qualifies: boolean;
}

type CartRow =
  | { type: 'section_header'; id: string; title: string; count?: number }
  | { type: 'regular_item'; id: string; cartKey: string; item: CartItem }
  | { type: 'offer_item'; id: string; offerItem: OfferCartItem }
  | { type: 'offer_note'; id: string; note: OfferNote }
  | { type: 'total_row'; id: string; total: number }
  | { type: 'empty'; id: string };

interface Props {
  route: any;
  navigation: any;
}

// ─────────────────────────────────────────────────────────────────────────────

const CartScreen: React.FC<Props> = ({ route, navigation }) => {
  const { outletId, outletName, distributorId, currentLocation, offers: passedOffers } = route.params;
  const offers: Offer[] = passedOffers || [];

  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');

  useEffect(() => {
    const init = async () => {
      const [savedCart, savedLang] = await Promise.all([
        salesAPI.loadCart(),
        AsyncStorage.getItem('@lang_pref'),
      ]);
      setCart(savedCart);
      if (savedLang) setLanguage(savedLang as 'bn' | 'en');
    };
    init();
  }, []);

  const productDisplayName = (item: CartItem) =>
    language === 'bn' ? item.bangla_name : item.english_name;

  // ── Computed offer / free items ───────────────────────────────
  const computedOfferItems = useMemo<OfferCartItem[]>(() => {
    const items: OfferCartItem[] = [];
    for (const offer of offers) {
      if (offer.offer_type !== 'BUY_X_GET_1_FREE' || !offer.skuFreeItems) { continue; }
      for (const freeItem of offer.skuFreeItems) {
        let totalQtyInCart = 0;
        for (const cartItem of cart.values()) {
          if (cartItem.product_id === freeItem.productId) {
            totalQtyInCart += cartItem.quantity;
          }
        }
        const freeQty = Math.floor(totalQtyInCart / freeItem.buyQty);
        if (freeQty > 0) {
          items.push({
            offer_id: offer._id,
            offer_name: offer.name,
            product_id: freeItem.productId,
            sku: freeItem.sku,
            english_name: freeItem.englishName,
            quantity: freeQty,
          });
        }
      }
    }
    return items;
  }, [cart, offers]);

  // ── Cart total (regular items only) ──────────────────────────
  const cartTotal = useMemo(
    () => [...cart.values()].reduce((s, i) => s + i.subtotal, 0),
    [cart],
  );

  // ── Offer notes (type-aware: flat, slab, cashback) ──────────
  const offerNotes = useMemo<OfferNote[]>(() => {
    const notes: OfferNote[] = [];
    for (const offer of offers) {
      if (offer.offer_type === 'BUY_X_GET_1_FREE') { continue; }

      if (offer.offer_type === 'DISCOUNT_SLAB_PCT' && offer.config.slabs?.length) {
        // Sort slabs ascending by minValue
        const slabs = [...offer.config.slabs].sort((a, b) => a.minValue - b.minValue);
        // Find the currently active slab
        const activeSlab = [...slabs].reverse().find(
          s => cartTotal >= s.minValue && cartTotal <= (s.maxValue ?? Infinity),
        );
        if (activeSlab) {
          const discountAmt = (cartTotal * (activeSlab.discountPercentage ?? 0)) / 100;
          // Find the next higher slab if any
          const nextSlab = slabs.find(s => s.minValue > cartTotal);
          const extra = nextSlab ? ` | Add ৳${(nextSlab.minValue - cartTotal).toFixed(2)} for ${nextSlab.discountPercentage}%` : '';
          notes.push({
            offer_id: `${offer._id}_active`,
            text: `✓ "${offer.name}": ${activeSlab.discountPercentage}% off → ৳${discountAmt.toFixed(2)}${extra}`,
            qualifies: true,
          });
        } else {
          // Below all slabs — show the first (lowest) slab threshold
          const firstSlab = slabs[0];
          const needed = firstSlab.minValue - cartTotal;
          notes.push({
            offer_id: `${offer._id}_nq`,
            text: `Add ৳${needed.toFixed(2)} more for ${firstSlab.discountPercentage}% off ("${offer.name}")`,
            qualifies: false,
          });
        }
        continue;
      }

      if (offer.offer_type === 'CASHBACK' && offer.config.cashbackPercentage != null) {
        const minVal = offer.config.minOrderValue ?? 0;
        if (cartTotal >= minVal) {
          let cashback = (cartTotal * offer.config.cashbackPercentage) / 100;
          if (offer.config.maxCashback && cashback > offer.config.maxCashback) {
            cashback = offer.config.maxCashback;
          }
          notes.push({
            offer_id: offer._id,
            text: `✓ "${offer.name}": ৳${cashback.toFixed(2)} cashback (${offer.config.cashbackPercentage}%)`,
            qualifies: true,
          });
        } else {
          notes.push({
            offer_id: offer._id,
            text: `Add ৳${(minVal - cartTotal).toFixed(2)} more for ${offer.config.cashbackPercentage}% cashback ("${offer.name}")`,
            qualifies: false,
          });
        }
        continue;
      }

      // FLAT_DISCOUNT_PCT / FLAT_DISCOUNT_AMT and other min-order-value offers
      if (offer.config.minOrderValue != null) {
        const minVal = offer.config.minOrderValue;
        const qualifies = cartTotal >= minVal;
        if (qualifies) {
          if (offer.config.discountPercentage) {
            const discountAmt = (cartTotal * offer.config.discountPercentage) / 100;
            notes.push({
              offer_id: offer._id,
              text: `✓ "${offer.name}": ${offer.config.discountPercentage}% off → ৳${discountAmt.toFixed(2)}`,
              qualifies: true,
            });
          } else if (offer.config.discountAmount) {
            notes.push({
              offer_id: offer._id,
              text: `✓ "${offer.name}": ৳${offer.config.discountAmount} discount`,
              qualifies: true,
            });
          } else {
            notes.push({ offer_id: offer._id, text: `✓ "${offer.name}" applies`, qualifies: true });
          }
        } else {
          notes.push({
            offer_id: offer._id,
            text: `Add ৳${(minVal - cartTotal).toFixed(2)} more to qualify for "${offer.name}"`,
            qualifies: false,
          });
        }
      }
    }
    return notes;
  }, [offers, cartTotal]);

  // ── updateQty ─────────────────────────────────────────────────
  const updateQty = useCallback((cartKey: string, newQty: number) => {
    setCart(prev => {
      const next = new Map(prev);
      const item = next.get(cartKey);
      if (!item) { return prev; }

      // Hard-clamp: cannot exceed available stock for this batch
      const maxQty = item.available_pcs ?? Infinity;
      const clampedQty = Math.min(Math.max(newQty, 0), maxQty);

      if (clampedQty <= 0) {
        next.delete(cartKey);
      } else {
        next.set(cartKey, { ...item, quantity: clampedQty, subtotal: clampedQty * item.unit_price });
      }

      // FIFO enforcement: if this batch is no longer fully consumed (qty < available_pcs),
      // all subsequent batches of the same product become invalid and are removed.
      if (
        item.batch_index != null &&
        item.available_pcs != null &&
        clampedQty < item.available_pcs
      ) {
        for (const [k, v] of next.entries()) {
          if (v.product_id === item.product_id && v.batch_index != null && v.batch_index > item.batch_index) {
            next.delete(k);
          }
        }
      }

      salesAPI.saveCart(next);
      return next;
    });
  }, []);

  // ── handleClearCart ───────────────────────────────────────────
  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items from the cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await salesAPI.clearCart(outletId);
          setCart(new Map());
          navigation.goBack();
        },
      },
    ]);
  };

  // ── handleSubmitOrder ─────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (cart.size === 0) {
      Alert.alert('Cart Empty', 'Please add items before submitting');
      return;
    }

    Alert.alert('Confirm Order', `Place order for ৳${cartTotal.toFixed(2)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Place Order',
        onPress: async () => {
          try {
            setSubmitting(true);
            const userJson = await AsyncStorage.getItem('user');
            const userId = userJson
              ? JSON.parse(userJson)?._id || JSON.parse(userJson)?.id
              : null;
            if (!userId) {
              Alert.alert('Error', 'Unable to identify logged-in user. Please log in again.');
              return;
            }

            const regularItems = [...cart.values()].map(item => ({
              product_id: item.product_id,
              sku: item.sku,
              batch_id: item.batch_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
            }));

            const freeItems = computedOfferItems.map(item => ({
              product_id: item.product_id,
              sku: item.sku,
              quantity: item.quantity,
              unit_price: 0,
              is_free: true,
              offer_id: item.offer_id,
            }));

            const orderData = {
              outlet_id: outletId,
              distributor_id: distributorId,
              dsr_id: userId,
              items: [...regularItems, ...freeItems],
              gps_location: {
                type: 'Point',
                coordinates: [currentLocation?.lng || 0, currentLocation?.lat || 0],
              },
            };

            const result = await salesAPI.placeOrder(orderData);
            await salesAPI.clearCart(outletId);
            setCart(new Map());

            if (result.queued) {
              Alert.alert(
                'Saved Offline',
                'No network. Your order has been saved and will sync automatically.',
                [{ text: 'OK', onPress: () => navigation.navigate('MainApp', { screen: 'Home' }) }],
              );
            } else {
              Alert.alert(
                'Order Placed',
                `Order ${result.data.order_number} placed successfully`,
                [{ text: 'OK', onPress: () => navigation.navigate('MainApp', { screen: 'Home' }) }],
              );
            }
          } catch (error: any) {
            if (error.code === 'INSUFFICIENT_STOCK') {
              Alert.alert('Stock Unavailable', friendlyErrorMessage(error, 'Some items are out of stock'));
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

  // ── flatListData ──────────────────────────────────────────────
  const flatListData = useMemo<CartRow[]>(() => {
    const rows: CartRow[] = [];

    if (cart.size === 0) {
      rows.push({ type: 'empty', id: 'empty' });
      return rows;
    }

    // Regular items section
    rows.push({ type: 'section_header', id: 'sh_regular', title: 'ORDER ITEMS', count: cart.size });
    for (const [cartKey, item] of cart.entries()) {
      rows.push({ type: 'regular_item', id: `r_${cartKey}`, cartKey, item });
    }

    // Free offer items section
    if (computedOfferItems.length > 0) {
      rows.push({
        type: 'section_header',
        id: 'sh_offers',
        title: 'FREE OFFER ITEMS',
        count: computedOfferItems.length,
      });
      for (const offerItem of computedOfferItems) {
        rows.push({
          type: 'offer_item',
          id: `oi_${offerItem.offer_id}_${offerItem.product_id}`,
          offerItem,
        });
      }
    }

    // Order total
    rows.push({ type: 'total_row', id: 'total', total: cartTotal });

    // Min-order-value offer notes
    for (const note of offerNotes) {
      rows.push({ type: 'offer_note', id: `on_${note.offer_id}`, note });
    }

    return rows;
  }, [cart, computedOfferItems, cartTotal, offerNotes]);

  // ── renderRow ─────────────────────────────────────────────────
  const renderRow = ({ item }: { item: CartRow }) => {
    switch (item.type) {

      case 'empty':
        return (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-cart" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <Text style={styles.emptySubText}>Go back to add products</Text>
          </View>
        );

      case 'section_header':
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{item.title}</Text>
            {item.count != null && (
              <View style={styles.sectionHeaderBadge}>
                <Text style={styles.sectionHeaderBadgeText}>{item.count}</Text>
              </View>
            )}
          </View>
        );

      case 'regular_item': {
        const { cartKey, item: ci } = item;
        const ctnVal = (ci.ctn_pcs && ci.ctn_pcs > 0)
          ? parseFloat((ci.quantity / ci.ctn_pcs).toFixed(2))
          : null;
        return (
          <View style={styles.regularRow}>
            {ci.image_url
              ? <Image source={{ uri: ci.image_url }} style={styles.productImage} />
              : (
                <View style={styles.productImagePlaceholder}>
                  <MaterialIcons name="image-not-supported" size={28} color="#ccc" />
                </View>
              )
            }
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{productDisplayName(ci)}</Text>
              <Text style={styles.itemSku}>SKU: {ci.sku}</Text>
              <Text style={styles.itemPrice}>৳{ci.unit_price.toFixed(2)} / pc</Text>
              {ctnVal !== null && (
                <Text style={styles.ctnLabel}>CTN: {ctnVal}</Text>
              )}
            </View>
            <View style={styles.itemRight}>
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  onPress={() => updateQty(cartKey, ci.quantity - 1)}
                  disabled={ci.quantity <= 1}>
                  <MaterialIcons
                    name="remove-circle-outline"
                    size={28}
                    color={ci.quantity <= 1 ? '#ccc' : '#e53935'}
                  />
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="number-pad"
                  value={String(ci.quantity)}
                  maxLength={5}
                  onChangeText={text => {
                    const v = parseInt(text, 10);
                    if (!isNaN(v) && v > 0) { updateQty(cartKey, v); }
                  }}
                />
                <TouchableOpacity
                  onPress={() => updateQty(cartKey, ci.quantity + 1)}>
                  <MaterialIcons
                    name="add-circle-outline"
                    size={28}
                    color="#43a047"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemSubtotal}>৳{ci.subtotal.toFixed(2)}</Text>
            </View>
          </View>
        );
      }

      case 'offer_item': {
        const { offerItem } = item;
        return (
          <View style={styles.offerRow}>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{offerItem.english_name}</Text>
              <Text style={styles.itemSku}>SKU: {offerItem.sku}</Text>
              <Text style={styles.offerSourceText}>{offerItem.offer_name}</Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.offerQty}>× {offerItem.quantity}</Text>
              <Text style={styles.offerZeroPrice}>৳0.00</Text>
            </View>
          </View>
        );
      }

      case 'total_row':
        return (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Order Total</Text>
            <Text style={styles.totalValue}>৳{item.total.toFixed(2)}</Text>
          </View>
        );

      case 'offer_note':
        return (
          <View style={[styles.offerNoteRow, item.note.qualifies && styles.offerNoteQualified]}>
            <MaterialIcons
              name={item.note.qualifies ? 'check-circle' : 'info-outline'}
              size={16}
              color={item.note.qualifies ? '#2e7d32' : '#f57c00'}
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <Text style={[styles.offerNoteText, item.note.qualifies && styles.offerNoteTextQualified]}>
              {item.note.text}
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  // ── render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Cart</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{outletName}</Text>
        </View>
        {cart.size > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn}>
            <MaterialIcons name="delete-outline" size={20} color="#fff" />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cart rows */}
      <FlatList
        style={{ flex: 1 }}
        data={flatListData}
        keyExtractor={row => row.id}
        renderItem={renderRow}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Submit bar */}
      {cart.size > 0 && (
        <View style={styles.submitBar}>
          <View>
            <Text style={styles.submitBarLabel}>Total</Text>
            <Text style={styles.submitBarTotal}>৳{cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
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
    backgroundColor: '#1565c0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  clearBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3949ab',
    letterSpacing: 0.8,
  },
  sectionHeaderBadge: {
    backgroundColor: '#c5cae9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3949ab',
  },
  regularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },
  productImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#dcedc8',
  },
  freeBadge: {
    backgroundColor: '#2e7d32',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 10,
    alignSelf: 'flex-start',
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  itemSku: {
    fontSize: 11,
    color: '#000',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: '#000',
    marginTop: 2,
  },
  ctnLabel: {
    fontSize: 11,
    color: '#000',
    marginTop: 2,
    fontWeight: '500',
  },
  offerSourceText: {
    fontSize: 11,
    color: '#558b2f',
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  qtyInput: {
    fontSize: 15,
    fontWeight: 'bold',
    minWidth: 44,
    textAlign: 'center',
    color: '#000',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
    marginHorizontal: 4,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  offerQty: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 4,
  },
  offerZeroPrice: {
    fontSize: 13,
    color: '#aaa',
    textDecorationLine: 'line-through',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#1565c0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  offerNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#ffe0b2',
    marginTop: 2,
  },
  offerNoteQualified: {
    backgroundColor: '#e8f5e9',
    borderColor: '#c8e6c9',
  },
  offerNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#e65100',
  },
  offerNoteTextQualified: {
    color: '#2e7d32',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#000',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
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
  submitBarLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  submitBarTotal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  submitButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#1565c0',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default CartScreen;
