import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Image,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
// import Mapbox from '@rnmapbox/maps';
import PustiLogo from '../components/PustiLogo';
import UserInfoModal from '../components/UserInfoModal';
import locationService, {LocationPoint} from '../services/locationService';

// Mapbox.setAccessToken('pk.eyJ1Ijoicm9ja3Jnb21lc2FpIiwiYSI6ImNtbDhmOHptNjA2eTAzZm9rMXJqcmE3Y28ifQ.Q2nQrXEFSe7OgwnBjIh5bg');

const traceRouteIcon = require('../assets/images/trace-route.png');
const {width, height} = Dimensions.get('window');

const API_URL = 'http://10.0.2.2:8080/api/v1';
const MAPBOX_TOKEN = 'pk.eyJ1Ijoicm9ja3Jnb21lc2FpIiwiYSI6ImNtbDhmOHptNjA2eTAzZm9rMXJqcmE3Y28ifQ.Q2nQrXEFSe7OgwnBjIh5bg';

interface UserData {
  username: string;
  full_name?: string;
  email?: string;
  user_type: string;
  profile_photo?: string;
  employee_id?: any;
  distributor_id?: any;
  dsr_id?: any;
}

const HomeScreen = ({navigation, route}: any) => {
  const [loading, setLoading] = useState(true);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userType, setUserType] = useState<string>('');
  const [userDetails, setUserDetails] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('');
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [showTrackingDrawer, setShowTrackingDrawer] = useState(false);
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([90.4125, 23.8103]);
  const [routeCoordinates, setRouteCoordinates] = useState<number[][]>([]);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [visits, setVisits] = useState<number>(0);
  const statsInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  // Handle route params to open modal
  useEffect(() => {
    if (route?.params?.openUserInfo) {
      setShowUserInfoModal(true);
      // Clear the param after opening
      navigation.setParams({openUserInfo: undefined});
    }
  }, [route?.params?.openUserInfo]);

  // Animate drawer slide in/out
  useEffect(() => {
    if (showTrackingDrawer) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showTrackingDrawer]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // First load from AsyncStorage for immediate display
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName(user.full_name || user.username);
        setUserPhoto(user.profile_photo);
        setUserType(user.user_type);
        setUserRole(user.role?.role || '');
        
        // Set basic user details from AsyncStorage
        setUserDetails({
          type: 'basic',
          data: user,
          userId: user.username,
        });
      }
      
      // Then try to fetch full profile from backend
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000, // 5 second timeout
        });

        if (response.data.success) {
          const user = response.data.data;
          setUserName(user.full_name || user.username);
          setUserPhoto(user.profile_photo);
          setUserType(user.user_type);
          setUserRole(user.role?.role || '');
          
          // Store detailed info based on user type
          if (user.employee_id) {
            setUserDetails({
              type: 'employee',
              data: user.employee_id,
              userId: user.username,
            });
          } else if (user.distributor_id) {
            setUserDetails({
              type: 'distributor',
              data: user.distributor_id,
              userId: user.username,
            });
          } else if (user.dsr_id) {
            setUserDetails({
              type: 'dsr',
              data: user.dsr_id,
              userId: user.username,
            });
          } else {
            // User without specific profile (like superadmin)
            setUserDetails({
              type: 'basic',
              data: user,
              userId: user.username,
            });
          }
        }
      } catch (apiError) {
        // API call failed, but we already have AsyncStorage data
        console.log('Could not fetch full profile, using cached data');
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const shouldShowTrackButton = () => {
    const trackingRoles = ['ZSM', 'RSM', 'ASM', 'SO'];
    return trackingRoles.includes(userRole);
  };

  const handleTrackToggle = async () => {
    console.log('=== handleTrackToggle called ===');
    console.log('Current isTracking state:', isTracking);
    
    try {
      if (isTracking) {
        // Stop tracking
        const points = locationService.stopTracking();
        if (statsInterval.current) {
          clearInterval(statsInterval.current);
          statsInterval.current = null;
        }
        setIsTracking(false);
        
        Alert.alert(
          'Tracking Stopped',
          `Route saved with ${points.length} points.\nDistance: ${distance.toFixed(2)} km\nDuration: ${locationService.formatDuration(duration)}`,
          [{text: 'OK', onPress: () => setShowTrackingDrawer(false)}]
        );
      } else {
        console.log('Starting tracking...');
        
        // Request permission and start tracking
        const hasPermission = await locationService.requestLocationPermission();
        console.log('Permission granted:', hasPermission);
        
        if (!hasPermission) {
          Alert.alert('Permission Denied', 'Location permission is required for tracking.');
          return;
        }

        try {
          console.log('Getting current position...');
          const position = await locationService.getCurrentPosition();
          console.log('Current position:', position);
          setCurrentLocation([position.longitude, position.latitude]);
        } catch (error) {
          console.error('Could not get current location:', error);
          Alert.alert('Location Error', 'Could not get your current location. Make sure GPS is enabled.');
          return;
        }

        setRouteCoordinates([]);
        setDistance(0);
        setDuration(0);
        setVisits(0);
        setIsTracking(true);
        setShowTrackingDrawer(true);

        console.log('Starting location tracking service...');
        locationService.startTracking((point: LocationPoint) => {
          console.log('Location update:', point);
          setCurrentLocation([point.longitude, point.latitude]);
          const points = locationService.getLocationPoints();
          setRouteCoordinates(points.map(p => [p.longitude, p.latitude]));
        });

        // Update stats every second
        statsInterval.current = setInterval(() => {
          setDistance(locationService.calculateDistance());
          setDuration(locationService.getDuration());
        }, 1000);
      }
    } catch (error) {
      console.error('Error in handleTrackToggle:', error);
      Alert.alert('Error', 'An error occurred while toggling tracking. Please try again.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        locationService.stopTracking();
      }
      if (statsInterval.current) {
        clearInterval(statsInterval.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <PustiLogo width={120} height={50} />
        </View>
        
        <View style={styles.userSection}>
          <TouchableOpacity style={styles.notificationIcon}>
            <Text style={styles.bellIcon}>🔔</Text>
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              {userPhoto ? (
                <Image
                  source={{uri: `http://10.0.2.2:8080${userPhoto}`}}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <View style={styles.content}>
          {shouldShowTrackButton() && (
            <View style={styles.moduleButtonsContainer}>
              <TouchableOpacity 
                style={[styles.moduleButton, isTracking && styles.moduleButtonActive]}
                onPress={handleTrackToggle}>
                <Text style={styles.moduleIcon}>
                  {isTracking ? '⏹️' : '🏍️'}
                </Text>
                <Text style={styles.moduleLabel}>
                  {isTracking ? 'Track Off' : 'Track On'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.moduleButton}>
                <Text style={styles.moduleIcon}>📍</Text>
                <Text style={styles.moduleLabel}>Smart Attendance</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.moduleButton}>
                <Image 
                  source={traceRouteIcon} 
                  style={styles.traceRouteImage}
                  resizeMode="contain"
                />
                <Text style={styles.moduleLabel}>Trace Route</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Tracking Map Drawer */}
      <Modal
        visible={showTrackingDrawer}
        transparent
        animationType="none"
        onRequestClose={() => setShowTrackingDrawer(false)}>
        <View style={styles.drawerContainer}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setShowTrackingDrawer(false)}
          />
          <Animated.View style={[styles.drawer, {transform: [{translateX: slideAnim}]}]}>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderContent}>
                <View style={styles.drawerStatusContainer}>
                  <View style={[styles.drawerStatusDot, isTracking && styles.drawerStatusDotActive]} />
                  <Text style={styles.drawerHeaderTitle}>
                    {isTracking ? 'Tracking Active' : 'Tracking Stopped'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowTrackingDrawer(false)} 
                  style={styles.drawerCloseButton}>
                  <Text style={styles.drawerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Map View */}
            <View style={styles.mapContainer}>
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapIcon}>🗺️</Text>
                <Text style={styles.mapText}>GPS Tracking Active</Text>
                <Text style={styles.mapSubtext}>
                  {isTracking ? `Location: ${currentLocation[1].toFixed(6)}, ${currentLocation[0].toFixed(6)}` : 'Waiting to start...'}
                </Text>
                {routeCoordinates.length > 0 && (
                  <Text style={styles.mapSubtext}>
                    {'\n'}Route points: {routeCoordinates.length}
                  </Text>
                )}
              </View>
            </View>

            {/* Stats Bar */}
            {isTracking && (
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{distance.toFixed(2)} km</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{locationService.formatDuration(duration)}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{visits}</Text>
                  <Text style={styles.statLabel}>Visits</Text>
                </View>
              </View>
            )}

            {/* Control Button */}
            <View style={styles.drawerControlContainer}>
              <TouchableOpacity
                style={[styles.drawerControlButton, isTracking && styles.drawerControlButtonStop]}
                onPress={handleTrackToggle}>
                <Text style={styles.drawerControlIcon}>
                  {isTracking ? '⏹️' : '▶️'}
                </Text>
                <Text style={styles.drawerControlText}>
                  {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* User Info Modal */}
      <UserInfoModal
        visible={showUserInfoModal}
        onClose={() => setShowUserInfoModal(false)}
        userDetails={userDetails}
      />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logoContainer: {
    justifyContent: 'flex-start',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
  },
  avatarSection: {
    alignItems: 'center',
  },
  notificationIcon: {
    position: 'relative',
    padding: 8,
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  moduleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 15,
  },
  moduleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
    minWidth: 100,
  },
  moduleButtonActive: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  moduleIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  traceRouteImage: {
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  moduleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  trackButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '33%',
  },
  trackIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  trackLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  // Tracking Drawer Styles
  drawerContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  drawer: {
    width: width * 0.9,
    height: height,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: -2, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  drawerHeader: {
    backgroundColor: '#4CAF50',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  drawerHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    opacity: 0.5,
  },
  drawerStatusDotActive: {
    backgroundColor: '#fff',
    opacity: 1,
  },
  drawerHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  drawerCloseButton: {
    padding: 5,
  },
  drawerCloseText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  mapIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 15,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  drawerControlContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  drawerControlButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  drawerControlButtonStop: {
    backgroundColor: '#f44336',
  },
  drawerControlIcon: {
    fontSize: 24,
  },
  drawerControlText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default HomeScreen;
