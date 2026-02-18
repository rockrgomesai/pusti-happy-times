/**
 * No Sales Reason Screen
 * Allows SO to record reason why no order was placed at outlet
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:8080/api/v1';

type RootStackParamList = {
  NoSalesReason: {
    outletId: string;
    outletName: string;
    distributorId: string;
    currentLocation: { latitude: number; longitude: number };
  };
};

type NoSalesReasonScreenRouteProp = RouteProp<RootStackParamList, 'NoSalesReason'>;
type NoSalesReasonScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NoSalesReason'>;

const NO_SALES_REASONS = [
  {
    value: 'previous_order_not_delivered',
    label: 'Previous Order Not Delivered',
    icon: 'truck-delivery',
    description: 'Last order is still pending',
  },
  {
    value: 'payment_issues',
    label: 'Payment Issues',
    icon: 'cash-remove',
    description: 'Outstanding payment problems',
  },
  {
    value: 'overstocked',
    label: 'Overstocked',
    icon: 'package-variant',
    description: 'Already has sufficient inventory',
  },
  {
    value: 'credit_limit_reached',
    label: 'Credit Limit Reached',
    icon: 'credit-card-off',
    description: 'Maximum credit utilized',
  },
  {
    value: 'outlet_requested_delay',
    label: 'Outlet Requested Delay',
    icon: 'clock-alert',
    description: 'Customer wants to order later',
  },
  {
    value: 'price_concerns',
    label: 'Price Concerns',
    icon: 'currency-bdt',
    description: 'Pricing is not competitive',
  },
  {
    value: 'competitor_issues',
    label: 'Competitor Issues',
    icon: 'shield-alert',
    description: 'Competitor influence or issues',
  },
  {
    value: 'other',
    label: 'Other',
    icon: 'dots-horizontal',
    description: 'Other reason (specify in notes)',
  },
];

export default function NoSalesReasonScreen() {
  const route = useRoute<NoSalesReasonScreenRouteProp>();
  const navigation = useNavigation<NoSalesReasonScreenNavigationProp>();
  const { outletId, outletName, distributorId, currentLocation } = route.params;

  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      // Validation
      if (!selectedReason) {
        Alert.alert('Required', 'Please select a reason for no sales');
        return;
      }

      if (selectedReason === 'other' && !notes.trim()) {
        Alert.alert('Required', 'Please provide notes when selecting "Other"');
        return;
      }

      setSubmitting(true);

      const token = await AsyncStorage.getItem('@auth_token');
      const response = await fetch(`${API_URL}/outlet-visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          outlet_id: outletId,
          visit_type: 'no_sales',
          shop_status: 'Open',
          no_sales_reason: selectedReason,
          no_sales_notes: notes.trim() || undefined,
          gps_location: {
            coordinates: [currentLocation.longitude, currentLocation.latitude],
          },
          so_notes: `No sales - ${NO_SALES_REASONS.find((r) => r.value === selectedReason)?.label}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Visit recorded - No sales', [
          { text: 'OK', onPress: () => navigation.navigate('Home' as any) },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to record visit');
      }
    } catch (error) {
      console.error('Error recording no sales visit:', error);
      Alert.alert('Error', 'Failed to record visit');
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={styles.headerTitle}>No Sales Reason</Text>
          <Text style={styles.headerSubtitle}>{outletName}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Icon name="information" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            Please select the reason why no order was placed at this outlet.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Select Reason *</Text>

        {/* Reasons List */}
        {NO_SALES_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.value}
            style={[
              styles.reasonCard,
              selectedReason === reason.value && styles.reasonCardSelected,
            ]}
            onPress={() => setSelectedReason(reason.value)}
          >
            <View style={styles.reasonLeft}>
              <View
                style={[
                  styles.radioOuter,
                  selectedReason === reason.value && styles.radioOuterSelected,
                ]}
              >
                {selectedReason === reason.value && <View style={styles.radioInner} />}
              </View>
              <View style={styles.reasonIconContainer}>
                <Icon
                  name={reason.icon}
                  size={24}
                  color={selectedReason === reason.value ? '#2196F3' : '#666'}
                />
              </View>
              <View style={styles.reasonTextContainer}>
                <Text
                  style={[
                    styles.reasonLabel,
                    selectedReason === reason.value && styles.reasonLabelSelected,
                  ]}
                >
                  {reason.label}
                </Text>
                <Text style={styles.reasonDescription}>{reason.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>
            Additional Notes {selectedReason === 'other' && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder={
              selectedReason === 'other'
                ? 'Please specify the reason...'
                : 'Add any additional information (optional)...'
            }
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Submit Button */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedReason || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedReason || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Visit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reasonCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  reasonCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#2196F3',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  reasonIconContainer: {
    marginRight: 12,
  },
  reasonTextContainer: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  reasonLabelSelected: {
    color: '#2196F3',
  },
  reasonDescription: {
    fontSize: 13,
    color: '#999',
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#f44336',
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
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
