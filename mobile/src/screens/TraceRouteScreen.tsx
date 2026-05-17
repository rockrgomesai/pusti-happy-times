import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as API_URL } from '../config/api';

interface Outlet {
  _id: string;
  outlet_id: string;
  outlet_name: string;
  outlet_name_bangla?: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  lati: number;
  longi: number;
  address?: string;
  active: boolean;
  visit_duration?: number; // Duration in minutes for today's visit
  is_visited_today?: boolean;
  is_checked_out?: boolean;
}

interface RouteData {
  route_id: string;
  route_name: string;
  distributor_id?: string;
  outlets: Outlet[];
}

const TraceRouteScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [routeName, setRouteName] = useState('');
  const [distributorId, setDistributorId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMyRoute();
  }, []);

  const fetchMyRoute = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        navigation.replace('Login');
        return;
      }

      // Get today's day
      const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const today = daysOfWeek[new Date().getDay()];

      const response = await fetch(`${API_URL}/routes/my-route?day=${today}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        navigation.replace('Login');
        return;
      }

      if (response.status === 403) {
        const errData = await response.json();
        console.log('[TRACE-ROUTE] Access denied:', errData);
        Alert.alert('Access Denied', errData.message || 'You do not have permission to view routes.');
        navigation.goBack();
        return;
      }

      const data = await response.json();
      console.log('[TRACE-ROUTE] Response status:', response.status, 'data:', JSON.stringify(data).substring(0, 200));

      if (!data.success) {
        if (response.status === 404) {
          Alert.alert('No Route Found', data.message || `No route assigned for ${today}`);
        } else {
          Alert.alert('Error', data.message || 'Failed to load route');
        }
        navigation.goBack();
        return;
      }

      const routeData: RouteData = data.data;
      setRouteName(routeData.route_name || routeData.route_id);
      if (routeData.distributor_id) setDistributorId(routeData.distributor_id);

      // Filter outlets with valid coordinates
      const validOutlets = routeData.outlets.filter(
        o => o.lati !== 0 && o.longi !== 0 && o.active
      );

      // Log first few outlets for debugging
      console.log('[TRACE-ROUTE] Sample outlet coordinates:');
      validOutlets.slice(0, 3).forEach(o => {
        console.log(`  ${o.outlet_name}: lat=${o.lati}, lng=${o.longi}`);
      });

      // Fetch today's visit durations
      if (validOutlets.length > 0) {
        try {
          const outletIds = validOutlets.map(o => o._id).join(',');
          const visitResponse = await fetch(
            `${API_URL}/outlet-visits/today-summary?outlet_ids=${outletIds}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (visitResponse.ok) {
            const visitData = await visitResponse.json();
            if (visitData.success) {
              const visitsByOutlet = visitData.data;

              // Merge visit data with outlets
              validOutlets.forEach(outlet => {
                const visitInfo = visitsByOutlet[outlet._id];
                if (visitInfo) {
                  outlet.visit_duration = visitInfo.duration_minutes;
                  outlet.is_visited_today = true;
                  outlet.is_checked_out = visitInfo.is_checked_out;
                }
              });
            }
          }
        } catch (error) {
          console.log('Failed to fetch visit durations:', error);
          // Continue without visit data
        }
      }

      setOutlets(validOutlets);

      if (validOutlets.length === 0) {
        Alert.alert('No Outlets', 'No outlets with valid GPS coordinates found in your route.');
      }

    } catch (error: any) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to load route data');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleGetIn = (outlet: Outlet) => {
    if (!distributorId) {
      Alert.alert('Error', 'Distributor information not loaded. Please try again.');
      return;
    }

    // Navigate to Shop Action screen with outlet details
    navigation.navigate('ShopAction', {
      outletId: outlet._id,
      outletName: outlet.outlet_name,
      outletAddress: outlet.address,
      outletLocation: {
        latitude: outlet.lati,
        longitude: outlet.longi,
      },
      distributorId,
    });
  };

  const filteredOutlets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const source = [...outlets].sort((a, b) =>
      a.outlet_name.localeCompare(b.outlet_name)
    );
    if (!q) return source;
    return source.filter(
      o =>
        o.outlet_name.toLowerCase().includes(q) ||
        (o.outlet_name_bangla || '').toLowerCase().includes(q) ||
        o.outlet_id.toLowerCase().includes(q)
    );
  }, [outlets, searchQuery]);

  const renderOutletRow = ({ item: outlet }: { item: Outlet }) => {
    const dotColor =
      outlet.is_visited_today && outlet.is_checked_out
        ? '#4CAF50'
        : outlet.is_visited_today && !outlet.is_checked_out
          ? '#FF9800'
          : '#E0E0E0';

    return (
      <TouchableOpacity
        style={styles.outletRow}
        onPress={() => navigation.navigate('OutletDetail', { outlet, distributorId })}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        <View style={styles.outletRowText}>
          <Text style={styles.outletRowName}>{outlet.outlet_name}</Text>
          {outlet.outlet_name_bangla ? (
            <Text style={styles.outletRowNameBangla}>{outlet.outlet_name_bangla}</Text>
          ) : null}
          <Text style={styles.outletRowId}>ID: {outlet.outlet_id}</Text>
          {outlet.is_visited_today && outlet.is_checked_out && outlet.visit_duration !== undefined && (
            <View style={[styles.visitChip, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.visitChipText, { color: '#4CAF50' }]}>
                ⏱ {outlet.visit_duration} min
              </Text>
            </View>
          )}
          {outlet.is_visited_today && !outlet.is_checked_out && (
            <View style={[styles.visitChip, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.visitChipText, { color: '#FF9800' }]}>
                🟢 In Progress
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trace My Route</Text>
          <Text style={styles.headerSubtitle}>{routeName}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      ) : (
        <>
          {/* Search bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search outlets..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Results count */}
          <Text style={styles.resultsCount}>
            {filteredOutlets.length} of {outlets.length} outlets
          </Text>

          {filteredOutlets.length === 0 && searchQuery.length > 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No outlets match "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOutlets}
              keyExtractor={item => item._id}
              renderItem={renderOutletRow}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Add New Shop FAB — lets SO register an outlet they've discovered
              on the current route (backend auto-scopes to today's route). */}
          <TouchableOpacity
            style={styles.addOutletFab}
            onPress={() => navigation.navigate('AddOutlet')}
            activeOpacity={0.85}>
            <Text style={styles.addOutletFabIcon}>＋</Text>
            <Text style={styles.addOutletFabText}>Add Shop</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#4CAF50',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#333',
  },
  searchClear: {
    padding: 8,
    marginLeft: 4,
  },
  searchClearText: {
    fontSize: 16,
    color: '#999',
  },
  resultsCount: {
    fontSize: 12,
    color: '#888',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  outletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    marginTop: 3,
    flexShrink: 0,
  },
  outletRowText: {
    flex: 1,
  },
  outletRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  outletRowNameBangla: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  outletRowId: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  visitChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  visitChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
    color: '#ccc',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  addOutletFab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6F00',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  addOutletFabIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 6,
    lineHeight: 22,
  },
  addOutletFabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default TraceRouteScreen;
