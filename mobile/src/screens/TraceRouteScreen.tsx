import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://tkgerp.com/api/v1';

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
  outlets: Outlet[];
}

const TraceRouteScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [routeName, setRouteName] = useState('');
  const [selectedOutlets, setSelectedOutlets] = useState<Outlet[]>([]);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showOutletsDrawer, setShowOutletsDrawer] = useState(false);

  const webViewRef = useRef<any>(null);
  const bottomSheetAnim = useRef(new Animated.Value(height)).current;
  const drawerAnim = useRef(new Animated.Value(width)).current;

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

  const handleMarkerClick = (clusterType: string, specificOutletId?: string) => {
    console.log(`[TRACE-ROUTE] Marker clicked - cluster type: ${clusterType}`);

    let outletsToShow: Outlet[];

    if (clusterType === 'C1' || clusterType === 'C2') {
      // Show all outlets of this cluster type
      outletsToShow = outlets.filter(o => o.outlet_name.startsWith(clusterType));
      console.log(`[TRACE-ROUTE] Found ${outletsToShow.length} outlets for cluster ${clusterType}`);
    } else {
      // Individual outlet - find by ID
      outletsToShow = outlets.filter(o => o._id === specificOutletId);
      console.log(`[TRACE-ROUTE] Found ${outletsToShow.length} outlet for ID ${specificOutletId}`);
    }

    if (outletsToShow.length > 0) {
      setSelectedOutlets(outletsToShow);
      showBottomSheetModal();
    }
  };

  const showBottomSheetModal = () => {
    setShowBottomSheet(true);
    Animated.spring(bottomSheetAnim, {
      toValue: height * 0.4,
      useNativeDriver: false,
    }).start();
  };

  const hideBottomSheet = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setShowBottomSheet(false);
      setSelectedOutlets([]);
    });
  };

  const toggleOutletsDrawer = () => {
    if (showOutletsDrawer) {
      Animated.timing(drawerAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setShowOutletsDrawer(false));
    } else {
      setShowOutletsDrawer(true);
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleOutletListItemClick = (outlet: Outlet) => {
    // Pan map to outlet
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'panToOutlet',
        lat: outlet.lati,
        lng: outlet.longi,
      }));
    }

    // Close drawer
    toggleOutletsDrawer();

    // Show bottom sheet after short delay
    setTimeout(() => {
      setSelectedOutlets([outlet]);
      showBottomSheetModal();
    }, 500);
  };

  const handleGetIn = (outlet: Outlet) => {
    hideBottomSheet();

    // Navigate to Shop Action screen with outlet details
    navigation.navigate('ShopAction', {
      outletId: outlet._id,
      outletName: outlet.outlet_name,
      outletAddress: outlet.address,
      outletLocation: {
        latitude: outlet.lati,
        longitude: outlet.longi,
      },
      distributorId: 'DIST-001', // TODO: Get from route data or user context
    });
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[TRACE-ROUTE] WebView message received:', message);

      if (message.type === 'markerClick') {
        handleMarkerClick(message.clusterType, message.outletId);
      } else if (message.type === 'mapReady') {
        // Map is initialized, now send outlets
        console.log('[TRACE-ROUTE] Map ready, sending outlets...');
        if (outlets.length > 0) {
          const outletsData = outlets.map(o => ({
            id: o._id,
            name: o.outlet_name,
            nameBangla: o.outlet_name_bangla || '',
            lat: o.lati,
            lng: o.longi,
          }));

          console.log(`[TRACE-ROUTE] Sending ${outletsData.length} outlets to map`);

          webViewRef.current?.postMessage(JSON.stringify({
            type: 'setOutlets',
            outlets: outletsData,
          }));
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Sort outlets alphabetically
  const sortedOutlets = [...outlets].sort((a, b) =>
    a.outlet_name.localeCompare(b.outlet_name)
  );

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
        <TouchableOpacity onPress={toggleOutletsDrawer} style={styles.outletsButton}>
          <Text style={styles.outletsIcon}>☰</Text>
          <Text style={styles.outletsText}>Outlets</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      ) : (
        <>
          {/* Map View */}
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <style>
                        body, html { margin: 0; padding: 0; height: 100%; }
                        #map { height: 100%; width: 100%; }
                        .green-marker {
                          background-color: #4CAF50;
                          width: 24px;
                          height: 24px;
                          border-radius: 50% 50% 50% 0;
                          transform: rotate(-45deg);
                          border: 2px solid #fff;
                        }
                        .orange-marker {
                          background-color: #FF9800;
                          width: 24px;
                          height: 24px;
                          border-radius: 50% 50% 50% 0;
                          transform: rotate(-45deg);
                          border: 2px solid #fff;
                        }
                        .blue-marker {
                          background-color: #2196F3;
                          width: 24px;
                          height: 24px;
                          border-radius: 50% 50% 50% 0;
                          transform: rotate(-45deg);
                          border: 2px solid #fff;
                        }
                      </style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <script>
                        let map, markers = {};
                        
                        function initMap() {
                          const defaultLocation = [23.8103, 90.4125]; // Dhaka center
                          
                          map = L.map('map').setView(defaultLocation, 13);
                          
                          // OpenStreetMap tiles
                          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap contributors',
                            maxZoom: 19
                          }).addTo(map);
                          
                          // Notify React Native that map is ready
                          setTimeout(() => {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                              type: 'mapReady'
                            }));
                          }, 500);
                        }
                        
                        function addOutlets(outlets) {
                          if (!outlets || outlets.length === 0) {
                            console.log('No outlets to add');
                            return;
                          }
                          
                          console.log('Adding', outlets.length, 'outlets to map');
                          
                          // Clear existing markers
                          Object.values(markers).forEach(marker => {
                            map.removeLayer(marker);
                          });
                          markers = {};
                          
                          const bounds = [];
                          
                          // Create custom icons
                          const greenIcon = L.divIcon({
                            className: 'green-marker',
                            iconSize: [24, 24],
                            iconAnchor: [12, 24]
                          });
                          
                          const orangeIcon = L.divIcon({
                            className: 'orange-marker',
                            iconSize: [24, 24],
                            iconAnchor: [12, 24]
                          });
                          
                          const blueIcon = L.divIcon({
                            className: 'blue-marker',
                            iconSize: [24, 24],
                            iconAnchor: [12, 24]
                          });
                          
                          // Group outlets by coordinates and determine cluster type
                          const locationMap = {};
                          outlets.forEach(outlet => {
                            const key = outlet.lat.toFixed(6) + ',' + outlet.lng.toFixed(6);
                            if (!locationMap[key]) {
                              locationMap[key] = {
                                lat: outlet.lat,
                                lng: outlet.lng,
                                outlets: [],
                                icon: blueIcon,
                                clusterType: 'individual',
                                firstOutletId: outlet.id
                              };
                            }
                            locationMap[key].outlets.push(outlet);
                            
                            // Set icon and cluster type based on first outlet's prefix
                            if (locationMap[key].outlets.length === 1) {
                              if (outlet.name.startsWith('C1')) {
                                locationMap[key].icon = greenIcon;
                                locationMap[key].clusterType = 'C1';
                              } else if (outlet.name.startsWith('C2')) {
                                locationMap[key].icon = orangeIcon;
                                locationMap[key].clusterType = 'C2';
                              } else {
                                locationMap[key].clusterType = 'individual';
                                locationMap[key].firstOutletId = outlet.id;
                              }
                            }
                          });
                          
                          // Create one marker per unique location
                          Object.values(locationMap).forEach(location => {
                            const marker = L.marker([location.lat, location.lng], {
                              icon: location.icon,
                              title: location.outlets.length + ' outlet(s)'
                            }).addTo(map);
                            
                            
                            marker.on('click', () => {
                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'markerClick',
                                clusterType: location.clusterType,
                                outletId: location.firstOutletId
                              }));
                            });
                            
                            bounds.push([location.lat, location.lng]);
                            
                            // Store all outlet IDs for this marker
                            location.outlets.forEach(outlet => {
                              markers[outlet.id] = marker;
                            });
                          });
                          
                          // Fit map to show all outlets
                          if (bounds.length > 0) {
                            map.fitBounds(bounds, { padding: [50, 50] });
                          }
                        }
                        
                        function panToOutlet(lat, lng) {
                          if (map) {
                            map.setView([lat, lng], 17);
                          }
                        }
                        
                        window.addEventListener('message', (event) => {
                          try {
                            const data = JSON.parse(event.data);
                            if (data.type === 'setOutlets') {
                              addOutlets(data.outlets);
                            } else if (data.type === 'panToOutlet') {
                              panToOutlet(data.lat, data.lng);
                            }
                          } catch(e) {}
                        });
                        
                        document.addEventListener('message', (event) => {
                          try {
                            const data = JSON.parse(event.data);
                            if (data.type === 'setOutlets') {
                              addOutlets(data.outlets);
                            } else if (data.type === 'panToOutlet') {
                              panToOutlet(data.lat, data.lng);
                            }
                          } catch(e) {}
                        });
                        
                        window.onload = initMap;
                      </script>
                    </body>
                  </html>
                `,
              }}
              style={styles.map}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleWebViewMessage}
            />
          </View>

          {/* Outlet count badge */}
          <View style={styles.outletCountBadge}>
            <Text style={styles.outletCountText}>{outlets.length} Outlets</Text>
          </View>
        </>
      )}

      {/* Bottom Sheet */}
      {showBottomSheet && selectedOutlets.length > 0 && (
        <Modal transparent visible={showBottomSheet} animationType="none">
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={hideBottomSheet}
          />
          <Animated.View style={[styles.bottomSheet, { top: bottomSheetAnim }]}>
            <View style={styles.bottomSheetHandle} />

            <View style={styles.bottomSheetContent}>
              {selectedOutlets.length === 1 ? (
                // Single outlet view
                <>
                  <Text style={styles.outletNameEnglish}>{selectedOutlets[0].outlet_name}</Text>
                  {selectedOutlets[0].outlet_name_bangla && (
                    <Text style={styles.outletNameBangla}>{selectedOutlets[0].outlet_name_bangla}</Text>
                  )}

                  {selectedOutlets[0].address && (
                    <Text style={styles.outletAddress}>{selectedOutlets[0].address}</Text>
                  )}

                  <TouchableOpacity style={styles.getInButton} onPress={() => handleGetIn(selectedOutlets[0])}>
                    <Text style={styles.getInButtonText}>Get In</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Multiple outlets at same location
                <>
                  <Text style={styles.bottomSheetTitle}>{selectedOutlets.length} Outlets at this location</Text>
                  <ScrollView style={styles.outletScrollList}>
                    {selectedOutlets.map((outlet, index) => (
                      <View key={outlet._id} style={styles.multiOutletItem}>
                        <View style={styles.multiOutletInfo}>
                          <Text style={styles.multiOutletName}>{outlet.outlet_name}</Text>
                          {outlet.outlet_name_bangla && (
                            <Text style={styles.multiOutletNameBangla}>{outlet.outlet_name_bangla}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.multiOutletGetInButton}
                          onPress={() => handleGetIn(outlet)}
                        >
                          <Text style={styles.multiOutletGetInText}>Get In</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </Animated.View>
        </Modal>
      )}

      {/* Outlets Drawer */}
      {showOutletsDrawer && (
        <Modal transparent visible={showOutletsDrawer} animationType="none">
          <View style={styles.drawerContainer}>
            <TouchableOpacity
              style={styles.drawerBackdrop}
              activeOpacity={1}
              onPress={toggleOutletsDrawer}
            />
            <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>All Outlets ({sortedOutlets.length})</Text>
                <TouchableOpacity onPress={toggleOutletsDrawer}>
                  <Text style={styles.drawerClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={sortedOutlets}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.outletListItem}
                    onPress={() => handleOutletListItemClick(item)}
                  >
                    <View style={styles.outletListTextContainer}>
                      <Text style={styles.outletListName}>{item.outlet_name}</Text>
                      {item.outlet_name_bangla && (
                        <Text style={styles.outletListNameBangla}>{item.outlet_name_bangla}</Text>
                      )}
                      <Text style={styles.outletListId}>{item.outlet_id}</Text>
                      {item.is_visited_today && item.is_checked_out && item.visit_duration !== undefined && (
                        <Text style={styles.visitDuration}>
                          ⏱️ {item.visit_duration} min{item.visit_duration !== 1 ? 's' : ''}
                        </Text>
                      )}
                      {item.is_visited_today && !item.is_checked_out && (
                        <Text style={styles.visitInProgress}>
                          🟢 Visit in progress
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </Animated.View>
          </View>
        </Modal>
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
  outletsButton: {
    alignItems: 'center',
    padding: 8,
  },
  outletsIcon: {
    fontSize: 24,
    color: '#4CAF50',
  },
  outletsText: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
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
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  outletCountBadge: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  outletCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.6,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
  },
  outletNameEnglish: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  outletNameBangla: {
    fontSize: 18,
    color: '#666',
    marginBottom: 12,
  },
  outletAddress: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  getInButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  getInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  drawer: {
    width: width * 0.85,
    height: height,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  drawerClose: {
    fontSize: 24,
    color: '#fff',
    padding: 5,
  },
  outletListItem: {
    padding: 15,
  },
  outletListTextContainer: {
    flex: 1,
  },
  outletListName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  outletListNameBangla: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  outletListId: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  visitDuration: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 6,
  },
  visitInProgress: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  outletScrollList: {
    maxHeight: height * 0.3,
  },
  multiOutletItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  multiOutletInfo: {
    flex: 1,
  },
  multiOutletName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  multiOutletNameBangla: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  multiOutletGetInButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  multiOutletGetInText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default TraceRouteScreen;
