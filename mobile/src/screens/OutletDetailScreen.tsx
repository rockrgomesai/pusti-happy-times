import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    PermissionsAndroid,
    ScrollView,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OutletDetailParams {
    outlet: {
        _id: string;
        outlet_id: string;
        outlet_name: string;
        outlet_name_bangla?: string;
        address?: string;
        lati: number;
        longi: number;
        is_visited_today?: boolean;
        is_checked_out?: boolean;
        visit_duration?: number;
    };
    distributorId: string;
}

interface CurrentLocation {
    latitude: number;
    longitude: number;
    accuracy: number;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
}

function formatCoord(value: number, isLat: boolean): string {
    const abs = Math.abs(value);
    const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${abs.toFixed(6)}° ${dir}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const OutletDetailScreen = ({ route, navigation }: any) => {
    const { outlet, distributorId } = route.params as OutletDetailParams;

    const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);

    const dbLocationUnknown = outlet.lati === 0 && outlet.longi === 0;

    // ── Geolocation ─────────────────────────────────────────────────────────────

    const fetchCurrentLocation = useCallback(async () => {
        setLocationLoading(true);
        setLocationError(null);
        setCurrentLocation(null);

        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                setLocationError('Location permission denied');
                setLocationLoading(false);
                return;
            }
        }

        Geolocation.getCurrentPosition(
            position => {
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                setLocationLoading(false);
            },
            _error => {
                setLocationError('Unable to get current location');
                setLocationLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
    }, []);

    useEffect(() => {
        fetchCurrentLocation();
    }, [fetchCurrentLocation]);

    // ── Derived distance ────────────────────────────────────────────────────────

    const distance =
        !dbLocationUnknown && currentLocation
            ? haversineDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                outlet.lati,
                outlet.longi,
            )
            : null;

    const distanceColor =
        distance === null
            ? '#888'
            : distance < 20
                ? '#4CAF50'
                : distance < 100
                    ? '#FF9800'
                    : '#F44336';

    const distancePrefix =
        distance === null
            ? ''
            : distance < 20
                ? '✅ '
                : distance < 100
                    ? '⚠ '
                    : '❌ ';

    const proximityHint =
        distance === null
            ? ''
            : distance < 20
                ? 'You are at this outlet'
                : distance < 100
                    ? 'You are nearby'
                    : 'You may be far from this outlet';

    // ── Actions ─────────────────────────────────────────────────────────────────

    const handleGetIn = () => {
        if (!distributorId) {
            Alert.alert('Error', 'Distributor information not loaded. Please try again.');
            return;
        }
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

    const refreshLocation = () => {
        fetchCurrentLocation();
    };

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Outlet Details</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Info card */}
                <View style={styles.infoCard}>
                    <Text style={styles.outletName}>{outlet.outlet_name}</Text>
                    {outlet.outlet_name_bangla ? (
                        <Text style={styles.outletNameBangla}>{outlet.outlet_name_bangla}</Text>
                    ) : null}
                    <Text style={styles.outletIdText}>ID: {outlet.outlet_id}</Text>
                    {outlet.address ? (
                        <Text style={styles.outletAddress}>{outlet.address}</Text>
                    ) : null}

                    {/* Visit chip */}
                    {outlet.is_visited_today && outlet.is_checked_out && (
                        <View style={[styles.visitChip, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={[styles.visitChipText, { color: '#4CAF50' }]}>
                                ⏱ {outlet.visit_duration ?? 0} min visited today
                            </Text>
                        </View>
                    )}
                    {outlet.is_visited_today && !outlet.is_checked_out && (
                        <View style={[styles.visitChip, { backgroundColor: '#FFF3E0' }]}>
                            <Text style={[styles.visitChipText, { color: '#FF9800' }]}>
                                🟢 Visit in progress
                            </Text>
                        </View>
                    )}
                </View>

                {/* Location Comparison */}
                <Text style={styles.sectionHeading}>Location Comparison</Text>

                <View style={styles.locationCard}>
                    <View style={styles.locationRow}>
                        {/* DB column */}
                        <View style={[styles.locationCol, styles.locationColLeft]}>
                            <View style={styles.locationColHeader}>
                                <Text style={styles.locationColIcon}>📍</Text>
                                <Text style={styles.locationColTitle}>In Database</Text>
                            </View>
                            {dbLocationUnknown ? (
                                <Text style={styles.locationWarning}>⚠ No GPS on record</Text>
                            ) : (
                                <>
                                    <Text style={styles.coordText}>{formatCoord(outlet.lati, true)}</Text>
                                    <Text style={styles.coordText}>{formatCoord(outlet.longi, false)}</Text>
                                </>
                            )}
                        </View>

                        {/* GPS column */}
                        <View style={styles.locationCol}>
                            <View style={styles.locationColHeader}>
                                <Text style={styles.locationColIcon}>📡</Text>
                                <Text style={styles.locationColTitle}>Your GPS</Text>
                            </View>
                            {locationLoading ? (
                                <>
                                    <Text style={styles.locationSubtext}>Getting location...</Text>
                                    <ActivityIndicator size="small" color="#006D77" style={{ marginTop: 4 }} />
                                </>
                            ) : locationError ? (
                                <>
                                    <Text style={styles.locationWarning}>⚠ {locationError}</Text>
                                    <TouchableOpacity onPress={refreshLocation} style={styles.retryLink}>
                                        <Text style={styles.retryLinkText}>Try Again</Text>
                                    </TouchableOpacity>
                                </>
                            ) : currentLocation ? (
                                <>
                                    <Text style={styles.coordText}>
                                        {formatCoord(currentLocation.latitude, true)}
                                    </Text>
                                    <Text style={styles.coordText}>
                                        {formatCoord(currentLocation.longitude, false)}
                                    </Text>
                                    <Text style={styles.accuracyText}>
                                        ±{Math.round(currentLocation.accuracy)} m accuracy
                                    </Text>
                                </>
                            ) : null}
                        </View>
                    </View>

                    {/* Distance row */}
                    {!dbLocationUnknown && !locationLoading && !locationError && distance !== null && (
                        <View style={styles.distanceRow}>
                            <Text style={[styles.distanceValue, { color: distanceColor }]}>
                                {distancePrefix}{formatDistance(distance)}
                            </Text>
                            <Text style={styles.distanceHint}>{proximityHint}</Text>
                        </View>
                    )}
                </View>

                {/* Get In */}
                <TouchableOpacity style={styles.getInButton} onPress={handleGetIn} activeOpacity={0.85}>
                    <Text style={styles.getInButtonText}>Get In →</Text>
                </TouchableOpacity>

                {/* Refresh */}
                <TouchableOpacity style={styles.refreshButton} onPress={refreshLocation}>
                    <Text style={styles.refreshButtonText}>Refresh Location</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#006D77',
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    backIcon: {
        fontSize: 24,
        color: '#fff',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    infoCard: {
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        elevation: 2,
    },
    outletName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    outletNameBangla: {
        fontSize: 15,
        color: '#666',
        marginTop: 4,
    },
    outletIdText: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 4,
    },
    outletAddress: {
        fontSize: 13,
        color: '#777',
        marginTop: 6,
    },
    visitChip: {
        marginTop: 10,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    visitChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    sectionHeading: {
        fontSize: 13,
        fontWeight: '700',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    locationCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
    },
    locationRow: {
        flexDirection: 'row',
    },
    locationCol: {
        flex: 1,
        padding: 16,
    },
    locationColLeft: {
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    locationColHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    locationColIcon: {
        fontSize: 16,
    },
    locationColTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#555',
        marginLeft: 6,
    },
    coordText: {
        fontSize: 14,
        color: '#222',
        fontWeight: '500',
        marginBottom: 4,
    },
    locationSubtext: {
        fontSize: 13,
        color: '#999',
    },
    locationWarning: {
        fontSize: 13,
        color: '#FF9800',
        fontWeight: '600',
    },
    retryLink: {
        marginTop: 6,
    },
    retryLinkText: {
        fontSize: 13,
        color: '#006D77',
        textDecorationLine: 'underline',
    },
    accuracyText: {
        fontSize: 11,
        color: '#bbb',
        marginTop: 2,
    },
    distanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        flexWrap: 'wrap',
        gap: 6,
    },
    distanceValue: {
        fontSize: 22,
        fontWeight: 'bold',
        marginRight: 8,
    },
    distanceHint: {
        fontSize: 13,
        color: '#888',
    },
    getInButton: {
        backgroundColor: '#4CAF50',
        marginHorizontal: 16,
        marginTop: 24,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 3,
    },
    getInButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    refreshButton: {
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 8,
    },
    refreshButtonText: {
        color: '#006D77',
        fontSize: 14,
    },
});

export default OutletDetailScreen;
