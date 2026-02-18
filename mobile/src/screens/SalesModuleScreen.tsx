/**
 * Sales Module Screen
 * Browse products by category, view offers, and create orders
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import salesAPI, { Category, Product, Offer, CartItem } from '../services/salesAPI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  route: any;
  navigation: any;
}

const SalesModuleScreen: React.FC<Props> = ({ route, navigation }) => {
  const { outletId, outletName, distributorId, currentLocation } = route.params;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Product bottom sheet
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Cart drawer
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load offers, categories, and saved cart in parallel
      const [offersData, categoriesData, savedCart] = await Promise.all([
        salesAPI.getOffers(outletId, distributorId),
        salesAPI.getCategories(distributorId),
        salesAPI.loadCart(outletId),
      ]);

      setOffers(offersData);
      setCategories(categoriesData);
      setCart(savedCart);
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = async (category: Category) => {
    try {
      setSelectedCategory(category);
      setShowProductSheet(true);
      setLoadingProducts(true);

      const productsData = await salesAPI.getProducts(category._id, distributorId);
      setProducts(productsData);
    } catch (error) {
      console.error('Load products error:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const addToCart = async (product: Product, quantity: number) => {
    const existingIndex = cart.findIndex((item) => item.product_id === product._id);

    let newCart: CartItem[];
    if (existingIndex >= 0) {
      // Update existing item
      newCart = [...cart];
      newCart[existingIndex].quantity = quantity;
      newCart[existingIndex].subtotal = quantity * product.trade_price;
    } else {
      // Add new item
      newCart = [
        ...cart,
        {
          product_id: product._id,
          sku: product.sku,
          bangla_name: product.bangla_name,
          english_name: product.english_name,
          quantity,
          unit_price: product.trade_price,
          subtotal: quantity * product.trade_price,
        },
      ];
    }

    setCart(newCart);
    await salesAPI.saveCart(outletId, newCart);
  };

  const removeFromCart = async (productId: string) => {
    const newCart = cart.filter((item) => item.product_id !== productId);
    setCart(newCart);
    await salesAPI.saveCart(outletId, newCart);
  };

  const getCartItemQty = (productId: string): number => {
    const item = cart.find((i) => i.product_id === productId);
    return item ? item.quantity : 0;
  };

  const calculateCartTotal = (): number => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
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

            const userId = await require('@react-native-async-storage/async-storage').default.getItem('@user_id');

            const orderData = {
              outlet_id: outletId,
              distributor_id: distributorId,
              dsr_id: userId!,
              items: cart.map((item) => ({
                product_id: item.product_id,
                sku: item.sku,
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
            setCart([]);
            setShowCartDrawer(false);

            Alert.alert('Success', `Order ${result.data.order_number} placed successfully`, [
              { text: 'OK', onPress: () => navigation.navigate('Home') },
            ]);
          } catch (error: any) {
            console.error('Submit order error:', error);

            if (error.code === 'INSUFFICIENT_STOCK') {
              Alert.alert('Stock Unavailable', error.message || 'Some items are out of stock', [
                { text: 'OK' },
              ]);
            } else {
              Alert.alert('Error', error.message || 'Failed to place order');
            }
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading catalog...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Sales & Orders</Text>
          <Text style={styles.headerSubtitle}>{outletName}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Offers Carousel */}
        {offers.length > 0 && (
          <View style={styles.offersSection}>
            <Text style={styles.sectionTitle}>Active Offers</Text>
            <FlatList
              horizontal
              data={offers}
              keyExtractor={(item) => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersCarousel}
              renderItem={({ item }) => (
                <View style={styles.offerCard}>
                  <Icon name="gift" size={32} color="#fff" />
                  <Text style={styles.offerName}>{item.name}</Text>
                  <Text style={styles.offerDescription}>{item.description || 'Special offer'}</Text>
                  {item.config.minOrderValue && (
                    <Text style={styles.offerDetail}>Min Order: ₹{item.config.minOrderValue}</Text>
                  )}
                  <Text style={styles.offerValidity}>
                    Valid until: {new Date(item.end_date).toLocaleDateString()}
                  </Text>
                  <View style={styles.autoApplyBadge}>
                    <Icon name="check-circle" size={14} color="#4CAF50" />
                    <Text style={styles.autoApplyText}>Auto-applies if eligible</Text>
                  </View>
                </View>
              )}
            />
          </View>
        )}

        {/* Categories Grid */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category._id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
              >
                <View style={styles.categoryIconContainer}>
                  <Icon name="package-variant" size={40} color="#4CAF50" />
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {category.name}
                </Text>
                <Text style={styles.categoryCount}>{category.product_count} items</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => setShowCartDrawer(true)}>
          <View style={styles.cartBadge}>
            <Icon name="cart" size={24} color="#fff" />
            <View style={styles.cartBadgeCount}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          </View>
          <Text style={styles.cartTotal}>₹{calculateCartTotal()}</Text>
        </TouchableOpacity>
      )}

      {/* Product Bottom Sheet */}
      <Modal visible={showProductSheet} animationType="slide" onRequestClose={() => setShowProductSheet(false)}>
        <SafeAreaView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{selectedCategory?.name}</Text>
            <TouchableOpacity onPress={() => setShowProductSheet(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loadingProducts ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.productsList}
              renderItem={({ item }) => {
                const cartQty = getCartItemQty(item._id);
                return (
                  <View style={styles.productCard}>
                    <View style={styles.productImage}>
                      <Icon name="package-variant" size={40} color="#4CAF50" />
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{item.bangla_name}</Text>
                      <Text style={styles.productSku}>{item.sku}</Text>
                      <Text style={styles.productPrice}>₹{item.trade_price}/PCS</Text>
                      <Text
                        style={[
                          styles.productStock,
                          { color: item.available_qty > 50 ? '#4CAF50' : item.available_qty > 0 ? '#FF9800' : '#F44336' },
                        ]}
                      >
                        Available: {item.available_qty} PCS
                      </Text>
                    </View>
                    <View style={styles.productActions}>
                      {cartQty > 0 ? (
                        <View style={styles.quantityStepper}>
                          <TouchableOpacity
                            onPress={() => {
                              if (cartQty > 1) addToCart(item, cartQty - 1);
                              else removeFromCart(item._id);
                            }}
                          >
                            <Icon name="minus-circle" size={28} color="#F44336" />
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>{cartQty}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              if (cartQty < item.available_qty) {
                                addToCart(item, cartQty + 1);
                              } else {
                                Alert.alert('Stock Limit', `Only ${item.available_qty} PCS available`);
                              }
                            }}
                          >
                            <Icon name="plus-circle" size={28} color="#4CAF50" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item, 1)}>
                          <Text style={styles.addButtonText}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Cart Drawer */}
      <Modal visible={showCartDrawer} animationType="slide" onRequestClose={() => setShowCartDrawer(false)}>
        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.drawerHeader}>
            <TouchableOpacity onPress={() => setShowCartDrawer(false)}>
              <Icon name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.drawerTitle}>Your Order ({cart.length} items)</Text>
          </View>

          <ScrollView style={styles.drawerContent}>
            {cart.map((item) => (
              <View key={item.product_id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.bangla_name}</Text>
                  <Text style={styles.cartItemDetail}>
                    ₹{item.unit_price} × {item.quantity} PCS = ₹{item.subtotal}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeFromCart(item.product_id)}>
                  <Icon name="close-circle" size={24} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.drawerFooter}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>₹{calculateCartTotal()}</Text>
            </View>
            <TouchableOpacity
              style={[styles.placeOrderButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmitOrder}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.placeOrderText}>Place Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
  },
  backButton: {
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  offersSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  offersCarousel: {
    paddingRight: 16,
  },
  offerCard: {
    width: SCREEN_WIDTH * 0.8,
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 20,
    marginRight: 12,
    elevation: 4,
  },
  offerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  offerDetail: {
    fontSize: 12,
    color: '#fff',
    marginTop: 8,
  },
  offerValidity: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  autoApplyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  autoApplyText: {
    fontSize: 11,
    color: '#fff',
    marginLeft: 4,
  },
  categoriesSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
  },
  categoryIconContainer: {
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 10,
    color: '#666',
  },
  floatingCart: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadgeCount: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  productSku: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  productStock: {
    fontSize: 11,
    marginTop: 2,
  },
  productActions: {
    justifyContent: 'center',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
    minWidth: 30,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 16,
  },
  drawerContent: {
    flex: 1,
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cartItemDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  drawerFooter: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default SalesModuleScreen;
