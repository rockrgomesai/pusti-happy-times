/**
 * Shop Action Screen
 * Presents 5 action options after SO gets within 10m proximity of outlet
 * Options: 1) Shop Closed, 2) No Sales, 3) Audit Inventory, 4) Sales & Orders, 5) Damage Claim
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:8080/api/v1';

type RootStackParamList = {
  ShopAction: {
    outletId: string;
    outletName: string;
    outletAddress?: string;
    outletLocation: { latitude: number; longitude: number };
    distributorId: string;
  };
  DamageClaim: {
    outletId: string;
    outletName: string;
    distributorId: string;
    currentLocation: { latitude: number; longitude: number };
  };
  NoSalesReason: {
    outletId: string;
    outletName: string;
    distributorId: string;
    currentLocation: { latitude: number; longitude: number };
  };
  // Add other screens as they are implemented
};

type ShopActionScreenRouteProp = RouteProp<RootStackParamList, 'ShopAction'>;
type ShopActionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ShopAction'>;

const PROXIMITY_THRESHOLD_METERS = 10; // 10 meters strict

export default function ShopActionScreen() {
  const route = useRoute<ShopActionScreenRouteProp>();
  const navigation = useNavigation<ShopActionScreenNavigationProp>();
  const { outletId, outletName, outletAddress, outletLocation, distributorId } = route.params;

  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [proximityValid, setProximityValid] = useState(false);

  useEffect(() => {
    checkProximity();
  }, []);

  const checkProximity = async () => {
    try {
      setLoading(true);

      // Request location permissions
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Location permission is required');
          navigation.goBack();
          return;
        }
      }

      // Get current location
      Geolocation.getCurrentPosition(
        (position) => {
          const currentLoc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCurrentLocation(currentLoc);

          // Calculate distance using Haversine formula
          const calculatedDistance = calculateDistance(
            currentLoc.latitude,
            currentLoc.longitude,
            outletLocation.latitude,
            outletLocation.longitude
          );
          setDistance(calculatedDistance);

          if (calculatedDistance <= PROXIMITY_THRESHOLD_METERS) {
            setProximityValid(true);
          } else {
            Alert.alert(
              'Too Far',
              `You are ${Math.round(calculatedDistance)}m away from the outlet. Please get within ${PROXIMITY_THRESHOLD_METERS}m to perform actions.`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          Alert.alert('Error', 'Failed to get your location. Please try again.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      console.error('Proximity check error:', error);
      Alert.alert('Error', 'Failed to verify proximity', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setLoading(false);
    }
  };

  // Haversine formula to calculate distance between two GPS coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleShopClosed = () => {
    Alert.prompt(
      'Shop Closed',
      'Enter reason for closure (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason) => {
            try {
              if (!currentLocation) {
                Alert.alert('Error', 'Location not available');
                return;
              }

              // Call API to record shop closed visit
              const token = await AsyncStorage.getItem('@auth_token');
              const response = await fetch(`${API_URL}/outlet-visits`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  outlet_id: outletId,
                  visit_type: 'shop_closed',
                  shop_status: 'Closed',
                  shop_closed_reason: reason || undefined,
                  gps_location: {
                    coordinates: [currentLocation.longitude, currentLocation.latitude],
                  },
                  so_notes: 'Shop was found closed during visit',
                }),
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Shop closed status recorded', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert('Error', data.message || 'Failed to record visit');
              }
            } catch (error) {
              console.error('Error recording shop closed:', error);
              Alert.alert('Error', 'Failed to record shop closed status');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleNoSales = () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    navigation.navigate('NoSalesReason', {
      outletId,
      outletName,
      distributorId,
      currentLocation,
    });
  };

  const handleAuditInventory = () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Unable to get current location');
      return;
    }

    navigation.navigate('AuditInventory', {
      outletId,
      outletName,
      outletAddress,
      currentLocation,
      distributorId,
    });
  };

  const handleSalesOrders = () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Unable to get current location');
      return;
    }

    navigation.navigate('SalesModule', {
      outletId,
      outletName,
      outletAddress,
      currentLocation,
      distributorId,
    });
  };

  const handleDamageClaim = () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    navigation.navigate('DamageClaim', {
      outletId,
      outletName,
      distributorId,
      currentLocation,
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Verifying proximity...</Text>
      </View>
    );
  }

  if (!proximityValid) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="map-marker-distance" size={64} color="#f44336" />
        <Text style={styles.errorText}>Too Far from Outlet</Text>
        <Text style={styles.errorSubtext}>
          Please get within {PROXIMITY_THRESHOLD_METERS}m to perform actions
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <View style={styles.headerTitleRow}>
            <Icon name="map-marker-check" size={20} color="#4CAF50" />
            <Text style={styles.proximityBadge}>{Math.round(distance || 0)}m away</Text>
          </View>
          <Text style={styles.headerTitle}>{outletName}</Text>
          {outletAddress && <Text style={styles.headerSubtitle}>{outletAddress}</Text>}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.promptText}>What would you like to do?</Text>

        {/* Action Options */}
        <View style={styles.actionsGrid}>
          {/* Option 1: Shop Closed */}
          <TouchableOpacity style={styles.actionCard} onPress={handleShopClosed}>
            <View style={[styles.actionIconContainer, { backgroundColor: '#ff9800' }]}>
              <Icon name="store-off" size={32} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>Shop Closed</Text>
            <Text style={styles.actionSubtitle}>Record closed status</Text>
          </TouchableOpacity>

          {/* Option 2: No Sales */}
          <TouchableOpacity style={styles.actionCard} onPress={handleNoSales}>
            <View style={[styles.actionIconContainer, { backgroundColor: '#9c27b0' }]}>
              <Icon name="cancel" size={32} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>No Sales</Text>
            <Text style={styles.actionSubtitle}>Record reason</Text>
          </TouchableOpacity>

          {/* Option 3: Audit Inventory */}
          <TouchableOpacity style={styles.actionCard} onPress={handleAuditInventory}>
            <View style={[styles.actionIconContainer, { backgroundColor: '#00bcd4' }]}>
              <Icon name="clipboard-list" size={32} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>Audit Inventory</Text>
            <Text style={styles.actionSubtitle}>Count outlet stock</Text>
          </TouchableOpacity>

          {/* Option 4: Sales & Orders */}
          <TouchableOpacity style={styles.actionCard} onPress={handleSalesOrders}>
            <View style={[styles.actionIconContainer, { backgroundColor: '#4CAF50' }]}>
              <Icon name="cart" size={32} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>Sales & Orders</Text>
            <Text style={styles.actionSubtitle}>Place new order</Text>
          </TouchableOpacity>

          {/* Option 5: Damage Claim */}
          <TouchableOpacity
            style={[styles.actionCard, styles.damageClaimCard]}
            onPress={handleDamageClaim}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#f44336' }]}>
              <Icon name="package-variant-closed-remove" size={32} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>Damage Claim</Text>
            <Text style={styles.actionSubtitle}>Report damaged products</Text>
          </TouchableOpacity>
        </View>

        {/* Info Footer */}
        <View style={styles.infoFooter}>
          <Icon name="information" size={18} color="#666" />
          <Text style={styles.infoText}>
            Your location is verified. All actions will be logged with GPS coordinates.
          </Text>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#f44336',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  proximityBadge: {
    marginLeft: 6,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
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
    padding: 20,
  },
  promptText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  damageClaimCard: {
    width: '100%',
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
