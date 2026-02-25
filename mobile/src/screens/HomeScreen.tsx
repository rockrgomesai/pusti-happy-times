import React, { useEffect, useState, useRef } from 'react';
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
import { WebView } from 'react-native-webview';
import PustiLogo from '../components/PustiLogo';
import UserInfoModal from '../components/UserInfoModal';
import locationService, { LocationPoint } from '../services/locationService';
import mockLocationService, { MOCK_ROUTES } from '../services/mockLocationService';
import trackingAPI from '../services/trackingAPI';
import attendanceAPI from '../services/attendanceAPI';
import DeviceInfo from 'react-native-device-info';
import syncService, { SyncStatus } from '../services/syncService';

// Mock GPS route options
const MOCK_ROUTE = 'GULSHAN_LOOP'; // Options: GULSHAN_LOOP, DHAKA_COMMUTE, QUICK_TEST

// Location upload configuration
const UPLOAD_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const UPLOAD_BATCH_SIZE = 20; // Upload when 20 points collected

const traceRouteIcon = require('../assets/images/trace-route.png');
const { width, height } = Dimensions.get('window');

const API_URL = 'https://tkgerp.com/api/v1';
// Using OpenStreetMap - No API key needed!

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

const HomeScreen = ({ navigation, route }: any) => {
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
  const [useMockGPS, setUseMockGPS] = useState(false);
  const slideAnim = useRef(new Animated.Value(width)).current;
  const webViewRef = useRef<any>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([90.4125, 23.8103]);
  const [routeCoordinates, setRouteCoordinates] = useState<number[][]>([]);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [visits, setVisits] = useState<number>(0);
  const statsInterval = useRef<any>(null);

  // Tracking API integration state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const locationBuffer = useRef<LocationPoint[]>([]);
  const uploadIntervalRef = useRef<any>(null);
  const lastUploadTime = useRef<number>(Date.now());
  const lastToggleTime = useRef<number>(0); // Prevent rapid toggle clicks
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    queueSize: 0,
    isSyncing: false,
  });

  // Attendance state
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadUserData();
    checkAttendanceStatus();

    // Get initial real location
    getRealLocation();

    // Setup sync status listener
    const handleSyncStatus = (status: SyncStatus) => {
      setSyncStatus(status);
    };
    syncService.addSyncListener(handleSyncStatus);

    return () => {
      syncService.removeSyncListener(handleSyncStatus);
    };
  }, []);

  // Handle route params to open modal
  useEffect(() => {
    if (route?.params?.openUserInfo) {
      setShowUserInfoModal(true);
      // Clear the param after opening
      navigation.setParams({ openUserInfo: undefined });
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

        // Set loading to false now so UI shows
        setLoading(false);
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

  // Check attendance status on load
  const checkAttendanceStatus = async () => {
    try {
      const status = await attendanceAPI.getStatus();
      if (status.success && status.marked) {
        setAttendanceMarked(true);
        setAttendanceData(status.data);
        startPulseAnimation(); // Show green ring with pulse
      }
    } catch (error) {
      console.log('Could not fetch attendance status:', error);
    }
  };

  // Start pulse animation for avatar ring
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Stop pulse animation
  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // Pulse red temporarily for failure
  const pulseRed = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle attendance mark
  const handleMarkAttendance = async () => {
    if (attendanceMarked) {
      Alert.alert(
        'Already Marked',
        `Your attendance is already marked for today at ${attendanceData?.matched_location}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsMarkingAttendance(true);

    try {
      const result = await attendanceAPI.checkIn();

      if (result.success) {
        setAttendanceMarked(true);
        setAttendanceData(result.data);
        startPulseAnimation(); // Start green pulse

        Alert.alert(
          'Success! ✓',
          `Attendance marked successfully!\n\nLocation: ${result.data?.matched_location}\nDistance: ${result.data?.distance_meters}m`,
          [{ text: 'OK' }]
        );
      } else {
        pulseRed(); // Red pulse for failure
        Alert.alert('Failed', result.message, [{ text: 'OK' }]);
      }
    } catch (error: any) {
      pulseRed();

      // Check if session expired
      if (error.message && error.message.includes('Session expired')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.replace('Login');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to mark attendance. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  // Get real GPS location on page load
  const getRealLocation = async () => {
    try {
      const hasPermission = await locationService.requestLocationPermission();
      if (hasPermission) {
        const position = await locationService.getCurrentPosition();
        console.log('📍 Real location on load:', position);
        setCurrentLocation([position.longitude, position.latitude]);

        // Update map to center on real location
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'updateLocation',
            lat: position.latitude,
            lng: position.longitude
          }));
        }
      }
    } catch (error) {
      console.log('Could not get real location:', error);
      // Keep default Dhaka center location
    }
  };

  // Upload buffered locations to backend
  const uploadLocationBatch = async () => {
    if (!sessionId || locationBuffer.current.length === 0) {
      return;
    }

    const pointsToUpload = [...locationBuffer.current];
    locationBuffer.current = []; // Clear buffer
    lastUploadTime.current = Date.now();

    try {
      console.log(`📤 Uploading ${pointsToUpload.length} location points...`);
      const response = await trackingAPI.uploadLocations(sessionId, pointsToUpload);
      console.log('✅ Upload successful:', response);
    } catch (error) {
      console.error('❌ Failed to upload locations:', error);

      // Add to offline sync queue
      await syncService.addToQueue({
        type: 'upload_locations',
        priority: 2,
        endpoint: `/tracking/sessions/${sessionId}/locations/batch`,
        method: 'POST',
        data: {
          sessionId,
          locations: pointsToUpload,
        },
      });

      console.log('📦 Added to offline queue for retry');
    }
  };

  // Buffer location and upload when threshold is reached
  const bufferAndUploadLocation = async (point: LocationPoint) => {
    locationBuffer.current.push(point);

    const bufferSize = locationBuffer.current.length;
    const timeSinceLastUpload = Date.now() - lastUploadTime.current;

    // Upload if buffer is full OR 2 minutes have passed
    if (bufferSize >= UPLOAD_BATCH_SIZE || timeSinceLastUpload >= UPLOAD_INTERVAL_MS) {
      await uploadLocationBatch();
    }
  };

  const handleTrackToggle = async () => {
    console.log('=== handleTrackToggle called ===');
    console.log('Current isTracking state:', isTracking);

    // Prevent rapid toggling (debounce 2 seconds)
    const now = Date.now();
    if (lastToggleTime.current && now - lastToggleTime.current < 2000) {
      console.log('⚠️ Toggle blocked - too soon after last toggle (debounce)');
      return;
    }
    lastToggleTime.current = now;

    try {
      if (isTracking) {
        // Stop tracking - upload remaining buffer and close session
        console.log('Stopping tracking...');

        if (useMockGPS) {
          mockLocationService.stopMockTracking();
          console.log('🧪 Mock tracking stopped');
          setUseMockGPS(false);
        } else {
          locationService.stopTracking();
        }

        if (statsInterval.current) {
          clearInterval(statsInterval.current);
          statsInterval.current = null;
        }

        if (uploadIntervalRef.current) {
          clearInterval(uploadIntervalRef.current);
          uploadIntervalRef.current = null;
        }

        // Upload any remaining buffered locations
        if (sessionId && locationBuffer.current.length > 0) {
          await uploadLocationBatch();
        }

        // Stop the session on backend
        if (sessionId) {
          try {
            const stopResponse = await trackingAPI.stopSession(sessionId);
            console.log('✅ Session stopped:', stopResponse);
            console.log('📊 Response structure:', JSON.stringify(stopResponse, null, 2));

            // Safely access nested data
            const sessionData = stopResponse.data || stopResponse;
            const distance = sessionData.total_distance_km || 0;
            const duration = sessionData.total_duration_seconds || 0;
            const points = sessionData.total_points || 0;

            Alert.alert(
              'Tracking Stopped',
              `Route saved successfully!\n\nDistance: ${distance.toFixed(2)} km\nDuration: ${locationService.formatDuration(duration)}\nPoints recorded: ${points}`,
              [{ text: 'OK', onPress: () => setShowTrackingDrawer(false) }]
            );
          } catch (error: any) {
            console.error('❌ Failed to stop session:', error);
            console.error('❌ Error details:', JSON.stringify(error.response?.data || error.message, null, 2));
            Alert.alert('Warning', 'Tracking stopped locally but failed to sync with server.');
          }
        }

        setIsTracking(false);
        setSessionId(null);
        locationBuffer.current = [];
      } else {
        console.log('Starting tracking...');

        // Get device info
        const deviceInfo = {
          device_model: await DeviceInfo.getModel(),
          os_version: await DeviceInfo.getSystemVersion(),
          app_version: await DeviceInfo.getVersion(),
        };

        // Start tracking session on backend
        try {
          const sessionResponse = await trackingAPI.startSession(deviceInfo);
          console.log('✅ Session started:', sessionResponse);
          setSessionId(sessionResponse.data.session_id);
          lastUploadTime.current = Date.now();
        } catch (error: any) {
          console.log('📋 Session start error response:', JSON.stringify(error.response?.data, null, 2));

          // Check if there's already an active session - reuse it
          if (error.response?.data?.data?.session_id) {
            console.log('⚠️ Reusing existing active session:', error.response.data.data.session_id);
            setSessionId(error.response.data.data.session_id);
            lastUploadTime.current = Date.now();
          } else {
            console.error('❌ Failed to start session:', error);
            // User-friendly error messages
            let errorMessage = 'Could not start tracking session.';

            if (error.response?.status === 403 || error.response?.data?.message?.includes('employee')) {
              errorMessage = 'Tracking is only available for field officers (SO, DSR). Please login with an employee account.';
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
              errorMessage = 'Cannot connect to server. Please check your internet connection.';
            } else if (error.response?.status === 401) {
              errorMessage = 'Session expired. Please login again.';
            } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            }

            Alert.alert('Error', errorMessage);
            return;
          }
        }

        // 🧪 Mock GPS Mode for Testing
        if (useMockGPS) {
          console.log('🧪 MOCK GPS MODE ENABLED');
          console.log(`📍 Using route: ${MOCK_ROUTE}`);

          setRouteCoordinates([]);
          setDistance(0);
          setDuration(0);
          setVisits(0);
          setIsTracking(true);
          setShowTrackingDrawer(true);

          // Start mock tracking
          mockLocationService.startMockTracking(MOCK_ROUTE as keyof typeof MOCK_ROUTES, async (point: LocationPoint) => {
            console.log('🧪 Mock location update:', point);
            setCurrentLocation([point.longitude, point.latitude]);

            // Manually add to route (since we're not using real locationService)
            setRouteCoordinates(prev => [...prev, [point.longitude, point.latitude]]);

            // Buffer and upload to backend
            await bufferAndUploadLocation(point);

            // Update WebView map
            if (webViewRef.current) {
              webViewRef.current.postMessage(JSON.stringify({
                type: 'updateLocation',
                lat: point.latitude,
                lng: point.longitude
              }));
            }
          });

          // Mock stats updates
          statsInterval.current = setInterval(() => {
            setDistance(prev => prev + 0.05); // Simulate distance increase
            setDuration(prev => prev + 1);
          }, 1000);

          // Set up interval to force upload every 2 minutes
          uploadIntervalRef.current = setInterval(async () => {
            await uploadLocationBatch();
          }, UPLOAD_INTERVAL_MS);

          return;
        }

        // Real GPS tracking
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
        locationService.startTracking(async (point: LocationPoint) => {
          console.log('Location update:', point);
          setCurrentLocation([point.longitude, point.latitude]);
          const points = locationService.getLocationPoints();
          setRouteCoordinates(points.map(p => [p.longitude, p.latitude]));

          // Buffer and upload to backend
          await bufferAndUploadLocation(point);

          // Update WebView map
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
              type: 'updateLocation',
              lat: point.latitude,
              lng: point.longitude
            }));
          }
        });

        // Update stats every second
        statsInterval.current = setInterval(() => {
          setDistance(locationService.calculateDistance());
          setDuration(locationService.getDuration());
        }, 1000);

        // Set up interval to force upload every 2 minutes
        uploadIntervalRef.current = setInterval(async () => {
          await uploadLocationBatch();
        }, UPLOAD_INTERVAL_MS);
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
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
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
              <View style={styles.avatarContainer}>
                {/* Attendance Ring */}
                {attendanceMarked && (
                  <Animated.View
                    style={[
                      styles.attendanceRing,
                      {
                        transform: [{ scale: pulseAnim }],
                      }
                    ]}
                  />
                )}

                {/* Avatar */}
                {userPhoto ? (
                  <Image
                    source={{ uri: `https://tkgerp.com${userPhoto}` }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* Check Badge */}
                {attendanceMarked && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkBadgeText}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{userName}</Text>
            {attendanceMarked && (
              <Text style={styles.attendanceStatusText}>
                Present • {new Date(attendanceData?.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
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

              <TouchableOpacity
                style={[
                  styles.moduleButton,
                  attendanceMarked && styles.moduleButtonSuccess,
                  isMarkingAttendance && styles.moduleButtonDisabled,
                ]}
                onPress={handleMarkAttendance}
                disabled={isMarkingAttendance}>
                {isMarkingAttendance ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : (
                  <>
                    <Text style={styles.moduleIcon}>
                      {attendanceMarked ? '✓' : '📍'}
                    </Text>
                    <Text style={styles.moduleLabel}>
                      {attendanceMarked ? 'Marked' : 'Mark Attendance'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moduleButton}
                onPress={() => navigation.navigate('TraceRoute')}>
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
          <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
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

            {/* Map View - OpenStreetMap with Leaflet.js */}
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
                        </style>
                      </head>
                      <body>
                        <div id="map"></div>
                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        <script>
                          let map, marker, polyline;
                          const routeCoordinates = [];
                          
                          // Initialize OpenStreetMap with Leaflet
                          function initMap() {
                            const defaultLocation = [23.8103, 90.4125]; // [lat, lng]
                            
                            // Create map with OpenStreetMap tiles (100% FREE)
                            map = L.map('map').setView(defaultLocation, 15);
                            
                            // Add OpenStreetMap tile layer - NO API KEY NEEDED!
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                              attribution: '© OpenStreetMap contributors',
                              maxZoom: 19
                            }).addTo(map);
                            
                            // Create custom blue circle marker
                            marker = L.circleMarker(defaultLocation, {
                              radius: 8,
                              fillColor: '#4285F4',
                              color: '#ffffff',
                              weight: 2,
                              opacity: 1,
                              fillOpacity: 1
                            }).addTo(map);
                            
                            // Create polyline for route tracking
                            polyline = L.polyline([], {
                              color: '#4CAF50',
                              weight: 4,
                              opacity: 1.0
                            }).addTo(map);
                          }
                          
                          function updateLocation(lat, lng) {
                            const newPos = [lat, lng];
                            marker.setLatLng(newPos);
                            map.panTo(newPos);
                            routeCoordinates.push(newPos);
                            polyline.setLatLngs(routeCoordinates);
                          }
                          
                          window.addEventListener('message', (event) => {
                            try {
                              const data = JSON.parse(event.data);
                              if (data.type === 'updateLocation') {
                                updateLocation(data.lat, data.lng);
                              }
                            } catch(e) {}
                          });
                          
                          document.addEventListener('message', (event) => {
                            try {
                              const data = JSON.parse(event.data);
                              if (data.type === 'updateLocation') {
                                updateLocation(data.lat, data.lng);
                              }
                            } catch(e) {}
                          });
                          
                          // Initialize map when page loads
                          window.onload = initMap;
                        </script>
                      </body>
                    </html>
                  `,
                }}
                style={styles.map}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
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

              {/* Mock GPS Test Button */}
              {!isTracking && (
                <TouchableOpacity
                  style={[styles.mockGPSButton, useMockGPS && styles.mockGPSButtonActive]}
                  onPress={() => {
                    setUseMockGPS(!useMockGPS);
                    Alert.alert(
                      useMockGPS ? 'Real GPS' : 'Mock GPS Enabled',
                      useMockGPS
                        ? 'Switched to real GPS tracking'
                        : `Mock GPS enabled. Press "Start Tracking" to begin simulated route: ${MOCK_ROUTE}`
                    );
                  }}>
                  <Text style={styles.mockGPSIcon}>🧪</Text>
                  <Text style={styles.mockGPSText}>
                    {useMockGPS ? 'Using Mock GPS' : 'Test Mock GPS'}
                  </Text>
                </TouchableOpacity>
              )}
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
  avatarContainer: {
    position: 'relative',
    width: 50,
    height: 50,
  },
  attendanceRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#10B981',
    top: -5,
    left: -5,
    zIndex: 1,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  checkBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  attendanceStatusText: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '500',
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
    shadowOffset: { width: 0, height: 2 },
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
  moduleButtonSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#10B981',
  },
  moduleButtonDisabled: {
    opacity: 0.5,
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
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: -2, height: 0 },
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
    height: height * 0.5, // Fixed height instead of flex: 1
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  mockGPSButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  mockGPSButtonActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  mockGPSIcon: {
    fontSize: 20,
  },
  mockGPSText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});

export default HomeScreen;
