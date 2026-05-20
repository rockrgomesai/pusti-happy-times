import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import {
    fetchSchedule,
    ScheduleOrder,
} from '../services/dsrDeliveryAPI';
import { useFocusEffect } from '@react-navigation/native';

type OrderStatus = 'Approved' | 'Hold' | 'Delivered' | 'Bounced';

const statusColor: Record<OrderStatus, string> = {
    Approved: '#1565c0',
    Hold: '#f57c00',
    Delivered: '#2e7d32',
    Bounced: '#c62828',
};

const formatDate = (d: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} — ${days[d.getDay()]}`;
};

const DsrDeliveryScreen = ({ navigation }: any) => {
    const [orders, setOrders] = useState<ScheduleOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadSchedule = async () => {
        try {
            const data = await fetchSchedule();
            setOrders(data);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to load schedule');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadSchedule();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadSchedule();
    };

    // Summary counts
    const total = orders.length;
    const pending = orders.filter(o => o.order_status === 'Approved').length;
    const confirmed = orders.filter(o => o.order_status === 'Delivered').length;
    const bounced = orders.filter(o => o.order_status === 'Bounced').length;

    const renderOutletCard = ({ item }: { item: ScheduleOrder }) => (
        <TouchableOpacity
            style={[styles.outletCard, { borderLeftColor: statusColor[item.order_status] }]}
            onPress={() => navigation.navigate('DsrCart', { order: item })}
            activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
                <Text style={styles.outletName}>{item.outlet_id.outlet_name}</Text>
                <Text style={styles.outletAddress}>{item.outlet_id.address}</Text>
                <Text style={styles.outletOrderNum}>#{item.order_number}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.statusChip, { backgroundColor: statusColor[item.order_status] + '22' }]}>
                    <Text style={[styles.statusChipText, { color: statusColor[item.order_status] }]}>
                        {item.order_status}
                    </Text>
                </View>
                <Text style={styles.orderAmount}>৳{item.total_amount.toLocaleString()}</Text>
                <Text style={styles.orderPcs}>
                    {item.items.reduce((s, i) => s + ((i as any).ordered_qty || (i as any).quantity || 0), 0)} pcs
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 22 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>DSR Delivery</Text>
                <View style={styles.headerDate}>
                    <Text style={styles.headerDateText}>{formatDate(new Date())}</Text>
                </View>
            </View>

            {/* Summary bar */}
            <View style={styles.summaryBar}>
                {[
                    { label: 'Total', value: total },
                    { label: 'Pending', value: pending },
                    { label: 'Confirmed', value: confirmed },
                    { label: 'Bounced', value: bounced },
                ].map(s => (
                    <View key={s.label} style={styles.statChip}>
                        <Text style={styles.statValue}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1565c0" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={o => o._id}
                    renderItem={renderOutletCard}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 40, color: '#999' }}>
                            No orders scheduled for today
                        </Text>
                    }
                />
            )}

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },

    // Header
    header: { backgroundColor: '#1a237e', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 12 },
    headerDate: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    headerDateText: { color: '#fff', fontSize: 12 },

    // Summary bar
    summaryBar: { flexDirection: 'row', backgroundColor: '#283593', paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'space-around' },
    statChip: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
    statValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
    statLabel: { color: '#b3c5ff', fontSize: 10, marginTop: 2 },

    // Outlet card
    outletCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
    outletName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
    outletAddress: { fontSize: 12, color: '#666', marginTop: 2 },
    outletOrderNum: { fontSize: 11, color: '#999', marginTop: 4 },
    statusChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
    statusChipText: { fontSize: 11, fontWeight: '700' },
    orderAmount: { fontSize: 16, fontWeight: '700', color: '#1a237e' },
    orderPcs: { fontSize: 12, color: '#777', marginTop: 2 },
});

export default DsrDeliveryScreen;
