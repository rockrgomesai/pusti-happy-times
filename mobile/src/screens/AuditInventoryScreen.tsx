/**
 * Audit Inventory Screen
 * SO counts outlet's inventory by category with variance tracking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface AuditItem {
  product_id: string;
  audited_qty_pcs: number;
  previous_qty_pcs?: number;
  variance?: number;
  notes?: string;
}

interface Product {
  _id: string;
  sku: string;
  english_name: string;
  bangla_name: string;
  unit_per_case: number;
  trade_price: number;
  previous_qty_pcs: number;
}

interface Category {
  category: string;
  products: Product[];
}

interface PreviousAudit {
  audit_id: string;
  audit_date: string;
}

const AuditInventoryScreen = ({ route, navigation }: any) => {
  const {
    outletId,
    outletName,
    outletAddress,
    distributorId,
    currentLocation,
  } = route.params;

  const [categories, setCategories] = useState<Category[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [previousAudit, setPreviousAudit] = useState<PreviousAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load products with previous audit
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `https://tkgerp.com/api/v1/outlet-audits/products?outlet_id=${outletId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();

      if (result.success) {
        setCategories(result.data.categories || []);
        setPreviousAudit(result.data.previous_audit);

        // Load draft if exists
        const draftKey = `@audit_draft_${outletId}`;
        const draftData = await AsyncStorage.getItem(draftKey);

        if (draftData) {
          const draft = JSON.parse(draftData);
          Alert.alert(
            'Restore Draft?',
            `Found saved draft from ${new Date(draft.savedAt).toLocaleString()}. Restore it?`,
            [
              { text: 'Discard', onPress: () => AsyncStorage.removeItem(draftKey) },
              {
                text: 'Restore',
                onPress: () => {
                  setAuditItems(draft.items || []);
                  setNotes(draft.notes || '');
                },
              },
            ]
          );
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to load products');
      }
    } catch (error) {
      console.error('Load audit data error:', error);
      Alert.alert('Error', 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const updated = new Set(expandedCategories);
    if (updated.has(category)) {
      updated.delete(category);
    } else {
      updated.add(category);
    }
    setExpandedCategories(updated);
  };

  const updateAuditQty = (productId: string, qty: string, previousQty: number) => {
    const parsedQty = parseInt(qty) || 0;

    setAuditItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product_id === productId);

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          audited_qty_pcs: parsedQty,
          previous_qty_pcs: previousQty,
          variance: parsedQty - previousQty,
        };
        return updated;
      } else if (parsedQty > 0) {
        return [
          ...prev,
          {
            product_id: productId,
            audited_qty_pcs: parsedQty,
            previous_qty_pcs: previousQty,
            variance: parsedQty - previousQty,
          },
        ];
      }

      return prev;
    });
  };

  const getAuditedQty = (productId: string): number => {
    const item = auditItems.find((i) => i.product_id === productId);
    return item ? item.audited_qty_pcs : 0;
  };

  const saveDraft = async () => {
    try {
      const draftKey = `@audit_draft_${outletId}`;
      const draftData = {
        items: auditItems,
        notes,
        savedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(draftKey, JSON.stringify(draftData));
      Alert.alert('Success', 'Draft saved successfully');
    } catch (error) {
      console.error('Save draft error:', error);
      Alert.alert('Error', 'Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (auditItems.length === 0) {
      Alert.alert('Validation Error', 'Please count at least one product');
      return;
    }

    Alert.alert(
      'Confirm Submission',
      `Submit audit with ${auditItems.length} product${auditItems.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);

              const token = await AsyncStorage.getItem('accessToken');
              const userId = await AsyncStorage.getItem('@user_id');

              const payload = {
                outlet_id: outletId,
                so_id: userId,
                distributor_id: distributorId,
                items: auditItems,
                so_notes: notes,
                gps_location: {
                  type: 'Point',
                  coordinates: [currentLocation.lng, currentLocation.lat],
                },
              };

              const response = await fetch('https://tkgerp.com/api/v1/outlet-audits', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
              });

              const result = await response.json();

              if (result.success) {
                // Clear draft
                const draftKey = `@audit_draft_${outletId}`;
                await AsyncStorage.removeItem(draftKey);

                Alert.alert('Success', 'Audit submitted successfully', [
                  { text: 'OK', onPress: () => navigation.navigate('Home') },
                ]);
              } else {
                Alert.alert('Submission Failed', result.message || 'Unknown error');
              }
            } catch (error) {
              console.error('Submit audit error:', error);
              Alert.alert('Error', 'Failed to submit audit');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const calculateTotalVariance = () => {
    return auditItems.reduce((sum, item) => sum + (item.variance || 0), 0);
  };

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      products: cat.products.filter(
        (p) =>
          p.english_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.products.length > 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Audit Inventory</Text>
            <Text style={styles.headerSubtitle}>{outletName}</Text>
          </View>
          {auditItems.length > 0 && (
            <View style={styles.auditBadge}>
              <Text style={styles.auditBadgeText}>{auditItems.length}</Text>
            </View>
          )}
        </View>

        {/* Previous Audit Info */}
        {previousAudit && (
          <View style={styles.previousAuditCard}>
            <Icon name="history" size={20} color="#2196F3" />
            <Text style={styles.previousAuditText}>
              Last Audit: {previousAudit.audit_id} on{' '}
              {new Date(previousAudit.audit_date).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories */}
        <ScrollView style={styles.scrollContainer}>
          {filteredCategories.map((category) => (
            <View key={category.category} style={styles.categoryContainer}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category.category)}
              >
                <Text style={styles.categoryName}>{category.category}</Text>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryCount}>{category.products.length} products</Text>
                  <Icon
                    name={expandedCategories.has(category.category) ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color="#666"
                  />
                </View>
              </TouchableOpacity>

              {expandedCategories.has(category.category) && (
                <View style={styles.productsContainer}>
                  {category.products.map((product) => {
                    const auditedQty = getAuditedQty(product._id);
                    const variance = auditedQty - product.previous_qty_pcs;
                    const varianceColor = variance > 0 ? '#4CAF50' : variance < 0 ? '#F44336' : '#666';

                    return (
                      <View key={product._id} style={styles.productCard}>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName}>{product.english_name}</Text>
                          <Text style={styles.productSku}>{product.sku}</Text>
                          <Text style={styles.productPrevious}>
                            Previous: {product.previous_qty_pcs} PCS
                          </Text>
                        </View>

                        <View style={styles.productInputRow}>
                          <TextInput
                            style={styles.qtyInput}
                            keyboardType="numeric"
                            placeholder="0"
                            value={auditedQty > 0 ? auditedQty.toString() : ''}
                            onChangeText={(text) =>
                              updateAuditQty(product._id, text, product.previous_qty_pcs)
                            }
                          />
                          <Text style={styles.pcsLabel}>PCS</Text>

                          {auditedQty > 0 && (
                            <View style={[styles.varianceBadge, { backgroundColor: varianceColor }]}>
                              <Text style={styles.varianceText}>
                                {variance > 0 ? '+' : ''}{variance}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Notes */}
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Damaged items, expiry dates, etc..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Summary and Actions */}
        <View style={styles.bottomContainer}>
          {auditItems.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Variance:</Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      calculateTotalVariance() > 0
                        ? '#4CAF50'
                        : calculateTotalVariance() < 0
                          ? '#F44336'
                          : '#666',
                  },
                ]}
              >
                {calculateTotalVariance() > 0 ? '+' : ''}
                {calculateTotalVariance()} PCS
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.draftButton, submitting && styles.buttonDisabled]}
              onPress={saveDraft}
              disabled={submitting}
            >
              <Icon name="content-save-outline" size={20} color="#2196F3" />
              <Text style={styles.draftButtonText}>Save Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (auditItems.length === 0 || submitting) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={auditItems.length === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Audit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: '#2196F3',
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
  auditBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  auditBadgeText: {
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 14,
  },
  previousAuditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  previousAuditText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#1976D2',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 12,
  },
  categoryContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  productsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  productCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productPrevious: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
  },
  productInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    width: 80,
    textAlign: 'center',
  },
  pcsLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  varianceBadge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  varianceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },
  notesLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  bottomContainer: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  draftButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AuditInventoryScreen;
