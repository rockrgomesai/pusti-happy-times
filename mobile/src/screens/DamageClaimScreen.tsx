/**
 * Damage Claim Screen
 * Allows SO to report damaged/expired products found at outlets
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import damageClaimAPI, {
  DamageClaimItem,
  ProductForClaim,
  CategoryGroup,
} from '../services/damageClaimAPI';

type RootStackParamList = {
  DamageClaim: {
    outletId: string;
    outletName: string;
    distributorId: string;
    currentLocation: { latitude: number; longitude: number };
  };
};

type DamageClaimScreenRouteProp = RouteProp<RootStackParamList, 'DamageClaim'>;
type DamageClaimScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DamageClaim'>;

const DAMAGE_REASONS = [
  { value: 'physical_damage', label: 'Physical Damage', icon: 'package-variant-closed' },
  { value: 'expired', label: 'Expired', icon: 'calendar-remove' },
  { value: 'defective', label: 'Defective/Quality Issue', icon: 'alert-circle' },
  { value: 'near_expiry', label: 'Near Expiry', icon: 'calendar-clock' },
  { value: 'wrong_product', label: 'Wrong Product', icon: 'package-variant' },
  { value: 'packaging_damage', label: 'Packaging Damage', icon: 'package-down' },
  { value: 'quality_issue', label: 'Quality Issue', icon: 'star-off' },
];

export default function DamageClaimScreen() {
  const route = useRoute<DamageClaimScreenRouteProp>();
  const navigation = useNavigation<DamageClaimScreenNavigationProp>();
  const { outletId, outletName, distributorId, currentLocation } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [claimItems, setClaimItems] = useState<DamageClaimItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [soNotes, setSoNotes] = useState('');

  // Load products and draft on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load products
      const { data: categoryGroups } = await damageClaimAPI.getProductsForClaim(
        outletId,
        distributorId
      );
      setCategories(categoryGroups);

      // Load draft if exists
      const draft = await damageClaimAPI.loadDraft(outletId);
      if (draft && draft.items.length > 0) {
        Alert.alert(
          'Draft Found',
          `You have a saved draft from ${new Date(draft.savedAt).toLocaleString()}. Would you like to restore it?`,
          [
            {
              text: 'Discard',
              onPress: () => damageClaimAPI.clearDraft(outletId),
              style: 'destructive',
            },
            {
              text: 'Restore',
              onPress: () => {
                setClaimItems(draft.items);
                setSoNotes(draft.notes || '');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = useCallback(
    (product: ProductForClaim, reason: string, qty: number, notes?: string) => {
      const newItem: DamageClaimItem = {
        product_id: product._id,
        qty_claimed_pcs: qty,
        damage_reason: reason as any,
        notes,
      };

      setClaimItems((prev) => {
        // Check if product already in claim
        const existingIndex = prev.findIndex((item) => item.product_id === product._id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newItem;
          return updated;
        }
        return [...prev, newItem];
      });

      Alert.alert('Added', `${product.english_name} added to claim`);
    },
    []
  );

  const handleRemoveItem = useCallback((productId: string) => {
    setClaimItems((prev) => prev.filter((item) => item.product_id !== productId));
  }, []);

  const handleSaveDraft = async () => {
    try {
      if (claimItems.length === 0) {
        Alert.alert('No Items', 'Add at least one item to save draft');
        return;
      }

      await damageClaimAPI.saveDraft(outletId, claimItems, soNotes);
      Alert.alert('Saved', 'Draft saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (claimItems.length === 0) {
        Alert.alert('No Items', 'Add at least one item to submit claim');
        return;
      }

      // Confirm submission
      Alert.alert(
        'Submit Claim',
        `Submit claim with ${claimItems.length} item(s)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: async () => {
              setSubmitting(true);
              try {
                await damageClaimAPI.submitClaim({
                  outlet_id: outletId,
                  distributor_id: distributorId,
                  items: claimItems,
                  gps_location: {
                    coordinates: [currentLocation.longitude, currentLocation.latitude],
                  },
                  so_notes: soNotes,
                });

                // Clear draft
                await damageClaimAPI.clearDraft(outletId);

                Alert.alert('Success', 'Damage claim submitted successfully', [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to submit claim');
              } finally {
                setSubmitting(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit claim');
    }
  };

  const filteredCategories = categories.filter((catGroup) =>
    catGroup.products.some(
      (p) =>
        p.english_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getProductInClaim = (productId: string) => {
    return claimItems.find((item) => item.product_id === productId);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Damage Claim</Text>
          <Text style={styles.headerSubtitle}>{outletName}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Claim Summary Badge */}
      {claimItems.length > 0 && (
        <View style={styles.summaryBadge}>
          <Icon name="package-variant" size={20} color="#fff" />
          <Text style={styles.summaryText}>
            {claimItems.length} item(s) • {claimItems.reduce((sum, item) => sum + item.qty_claimed_pcs, 0)} PCS
          </Text>
        </View>
      )}

      {/* Products by Category */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="package-variant-closed" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>This outlet has no delivery history</Text>
          </View>
        ) : (
          filteredCategories.map((catGroup) => (
            <CategoryAccordion
              key={catGroup.category}
              category={catGroup.category}
              products={catGroup.products}
              expanded={expandedCategory === catGroup.category}
              onToggle={() =>
                setExpandedCategory(expandedCategory === catGroup.category ? null : catGroup.category)
              }
              onAddItem={handleAddItem}
              getProductInClaim={getProductInClaim}
              onRemoveItem={handleRemoveItem}
            />
          ))
        )}

        {/* SO Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional information about the damages..."
            value={soNotes}
            onChangeText={setSoNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.draftButton]}
          onPress={handleSaveDraft}
          disabled={submitting}
        >
          <Icon name="content-save" size={20} color="#2196F3" />
          <Text style={styles.draftButtonText}>Save Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || claimItems.length === 0}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Claim</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Category Accordion Component
interface CategoryAccordionProps {
  category: string;
  products: ProductForClaim[];
  expanded: boolean;
  onToggle: () => void;
  onAddItem: (product: ProductForClaim, reason: string, qty: number, notes?: string) => void;
  getProductInClaim: (productId: string) => DamageClaimItem | undefined;
  onRemoveItem: (productId: string) => void;
}

function CategoryAccordion({
  category,
  products,
  expanded,
  onToggle,
  onAddItem,
  getProductInClaim,
  onRemoveItem,
}: CategoryAccordionProps) {
  return (
    <View style={styles.categoryContainer}>
      <TouchableOpacity style={styles.categoryHeader} onPress={onToggle}>
        <Text style={styles.categoryName}>{category}</Text>
        <View style={styles.categoryHeaderRight}>
          <Text style={styles.productCount}>{products.length} products</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="#666" />
        </View>
      </TouchableOpacity>

      {expanded &&
        products.map((product) => {
          const inClaim = getProductInClaim(product._id);
          return (
            <ProductClaimCard
              key={product._id}
              product={product}
              onAddItem={onAddItem}
              inClaim={inClaim}
              onRemove={() => onRemoveItem(product._id)}
            />
          );
        })}
    </View>
  );
}

// Product Claim Card Component
interface ProductClaimCardProps {
  product: ProductForClaim;
  onAddItem: (product: ProductForClaim, reason: string, qty: number, notes?: string) => void;
  inClaim?: DamageClaimItem;
  onRemove: () => void;
}

function ProductClaimCard({ product, onAddItem, inClaim, onRemove }: ProductClaimCardProps) {
  const [showModal, setShowModal] = useState(false);

  const handleAdd = () => {
    setShowModal(true);
  };

  if (inClaim) {
    // Item already in claim - show compact view with remove option
    const reason = DAMAGE_REASONS.find((r) => r.value === inClaim.damage_reason);
    return (
      <View style={[styles.productCard, styles.productCardInClaim]}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.english_name}</Text>
          <Text style={styles.productSku}>{product.sku}</Text>
          <View style={styles.claimInfo}>
            <Text style={styles.claimQty}>{inClaim.qty_claimed_pcs} PCS</Text>
            <Text style={styles.claimReason}> • {reason?.label}</Text>
          </View>
          {inClaim.notes && <Text style={styles.claimNotes}>{inClaim.notes}</Text>}
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Icon name="close-circle" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.productCard} onPress={handleAdd}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.english_name}</Text>
          <Text style={styles.productSku}>{product.sku}</Text>
          <Text style={styles.productPrice}>৳{product.trade_price} /PCS</Text>
        </View>
        <View style={styles.addButton}>
          <Icon name="plus-circle" size={32} color="#2196F3" />
        </View>
      </TouchableOpacity>

      {showModal && (
        <AddClaimModal
          product={product}
          onClose={() => setShowModal(false)}
          onSubmit={(reason, qty, notes) => {
            onAddItem(product, reason, qty, notes);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

// Add Claim Modal Component
interface AddClaimModalProps {
  product: ProductForClaim;
  onClose: () => void;
  onSubmit: (reason: string, qty: number, notes?: string) => void;
}

function AddClaimModal({ product, onClose, onSubmit }: AddClaimModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a damage reason');
      return;
    }
    if (!qty || parseInt(qty) <= 0) {
      Alert.alert('Required', 'Please enter a valid quantity');
      return;
    }

    onSubmit(selectedReason, parseInt(qty), notes.trim() || undefined);
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add to Claim</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.modalProductName}>{product.english_name}</Text>
        <Text style={styles.modalProductSku}>{product.sku}</Text>

        <Text style={styles.modalLabel}>Quantity (PCS) *</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Enter quantity"
          keyboardType="numeric"
          value={qty}
          onChangeText={setQty}
        />

        <Text style={styles.modalLabel}>Damage Reason *</Text>
        <ScrollView style={styles.reasonsList}>
          {DAMAGE_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              style={[
                styles.reasonOption,
                selectedReason === reason.value && styles.reasonOptionSelected,
              ]}
              onPress={() => setSelectedReason(reason.value)}
            >
              <Icon
                name={reason.icon}
                size={20}
                color={selectedReason === reason.value ? '#2196F3' : '#666'}
              />
              <Text
                style={[
                  styles.reasonLabel,
                  selectedReason === reason.value && styles.reasonLabelSelected,
                ]}
              >
                {reason.label}
              </Text>
              {selectedReason === reason.value && (
                <Icon name="check-circle" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.modalLabel}>Notes (Optional)</Text>
        <TextInput
          style={[styles.modalInput, styles.modalTextArea]}
          placeholder="Additional details..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSubmitButton} onPress={handleSubmit}>
            <Text style={styles.modalSubmitText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  summaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  categoryContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCount: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productCardInClaim: {
    backgroundColor: '#f0f8ff',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  claimInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  claimQty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
  claimReason: {
    fontSize: 14,
    color: '#666',
  },
  claimNotes: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  addButton: {
    marginLeft: 12,
  },
  removeButton: {
    marginLeft: 12,
    padding: 4,
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  draftButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    marginRight: 8,
  },
  draftButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  modalProductSku: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  modalTextArea: {
    minHeight: 60,
  },
  reasonsList: {
    maxHeight: 200,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  reasonLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  reasonLabelSelected: {
    color: '#2196F3',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalSubmitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    marginLeft: 8,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
