import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchDeliveredOrders, DeliveredOrder, DeliveredSummary } from '../services/dsrDeliveryAPI';

const statusColor: Record<string, string> = {
    Delivered: '#2e7d32',
    Bounced: '#c62828',
};

const fmt = (n: number) => `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const OrderCard = ({ order }: { order: DeliveredOrder }) => {
    const [expanded, setExpanded] = useState(false);
    const isDelivered = order.order_status === 'Delivered';

    return (
        <TouchableOpacity
            style={[styles.card, { borderLeftColor: statusColor[order.order_status] }]}
            onPress={() => setExpanded(e => !e)}
            activeOpacity={0.8}>
            {/* Header row */}
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                    <Text style={styles.outletName}>{order.outlet_id?.outlet_name ?? '—'}</Text>
                    {order.outlet_id?.address ? (
                        <Text style={styles.outletAddress} numberOfLines={1}>{order.outlet_id.address}</Text>
                    ) : null}
                </View>
                <View style={styles.statusBadge}>
                    <Text style={[styles.statusText, { color: statusColor[order.order_status] }]}>
                        {order.order_status}
                    </Text>
                </View>
            </View>

            {/* Financials row */}
            {isDelivered ? (
                <View style={styles.financialRow}>
                    <View style={styles.financialItem}>
                        <Text style={styles.financialLabel}>Payable</Text>
                        <Text style={styles.financialValue}>{fmt(order.payable_amount ?? 0)}</Text>
                    </View>
                    <View style={styles.financialItem}>
                        <Text style={styles.financialLabel}>Cash Collected</Text>
                        <Text style={[styles.financialValue, { color: '#1565c0' }]}>{fmt(order.cash_collected ?? 0)}</Text>
                    </View>
                    <View style={styles.financialItem}>
                        <Text style={styles.financialLabel}>Credit Due</Text>
                        <Text style={[styles.financialValue, { color: (order.credit_balance_after ?? 0) > 0 ? '#c62828' : '#2e7d32' }]}>
                            {fmt(order.credit_balance_after ?? 0)}
                        </Text>
                    </View>
                </View>
            ) : (
                <View style={styles.bouncedRow}>
                    <Text style={styles.bouncedLabel}>Reason: </Text>
                    <Text style={styles.bouncedReason}>{order.bounced_reason ?? '—'}</Text>
                </View>
            )}

            {/* Expand / collapse items */}
            {expanded && isDelivered && order.delivery_items?.length > 0 && (
                <View style={styles.itemsContainer}>
                    <View style={styles.itemsHeader}>
                        <Text style={[styles.itemCol, { flex: 2 }]}>SKU</Text>
                        <Text style={[styles.itemCol, styles.itemRight]}>Qty</Text>
                        <Text style={[styles.itemCol, styles.itemRight]}>Price</Text>
                        <Text style={[styles.itemCol, styles.itemRight]}>Total</Text>
                    </View>
                    {order.delivery_items.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                            <Text style={[styles.itemText, { flex: 2 }]} numberOfLines={1}>{item.sku}</Text>
                            <Text style={[styles.itemText, styles.itemRight]}>{item.delivered_qty}</Text>
                            <Text style={[styles.itemText, styles.itemRight]}>{fmt(item.unit_price)}</Text>
                            <Text style={[styles.itemText, styles.itemRight]}>{fmt(item.line_total)}</Text>
                        </View>
                    ))}
                </View>
            )}

            <Text style={styles.tapHint}>{expanded ? '▲ Collapse' : '▼ Tap for details'}</Text>
        </TouchableOpacity>
    );
};

const DsrDeliveredScreen = ({ navigation }: any) => {
    const [orders, setOrders] = useState<DeliveredOrder[]>([]);
    const [summary, setSummary] = useState<DeliveredSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const data = await fetchDeliveredOrders();
            setOrders(data.orders);
            setSummary(data.summary);
        } catch (e: any) {
            setError(e.message ?? 'Failed to load delivered orders');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const today = new Date().toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' });

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Delivered Orders</Text>
                    <Text style={styles.headerDate}>{today}</Text>
                </View>
            </View>

            {/* Summary bar */}
            {summary && (
                <View style={styles.summaryBar}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{summary.total}</Text>
                        <Text style={styles.summaryLabel}>Total</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: '#2e7d32' }]}>{summary.delivered}</Text>
                        <Text style={styles.summaryLabel}>Delivered</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: '#c62828' }]}>{summary.bounced}</Text>
                        <Text style={styles.summaryLabel}>Bounced</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: '#1565c0', fontSize: 13 }]}>{fmt(summary.total_cash)}</Text>
                        <Text style={styles.summaryLabel}>Cash</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: '#c62828', fontSize: 13 }]}>{fmt(summary.total_credit)}</Text>
                        <Text style={styles.summaryLabel}>Credit Due</Text>
                    </View>
                </View>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1565c0" />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={item => item._id}
                    renderItem={({ item }) => <OrderCard order={item} />}
                    contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#1565c0']} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyIcon}>📦</Text>
                            <Text style={styles.emptyText}>No deliveries completed today</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default DsrDeliveredScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    header: {
        backgroundColor: '#1a237e',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    backBtn: { paddingRight: 12, paddingVertical: 4 },
    backArrow: { color: '#fff', fontSize: 22 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    headerDate: { color: '#c5cae9', fontSize: 12, marginTop: 2 },
    summaryBar: {
        flexDirection: 'row',
        backgroundColor: '#1a237e',
        paddingBottom: 12,
        paddingHorizontal: 8,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
    summaryLabel: { color: '#c5cae9', fontSize: 10, marginTop: 2 },
    listContent: { padding: 12, paddingBottom: 24 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 10,
        padding: 12,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    orderNumber: { fontSize: 13, fontWeight: '700', color: '#333' },
    outletName: { fontSize: 14, fontWeight: '600', color: '#1a237e', marginTop: 2 },
    outletAddress: { fontSize: 11, color: '#888', marginTop: 1 },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        backgroundColor: '#f5f5f5',
        marginLeft: 8,
        alignSelf: 'flex-start',
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    financialRow: {
        flexDirection: 'row',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    financialItem: { flex: 1, alignItems: 'center' },
    financialLabel: { fontSize: 10, color: '#888' },
    financialValue: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 2 },
    bouncedRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
    bouncedLabel: { fontSize: 12, color: '#888' },
    bouncedReason: { fontSize: 12, color: '#c62828', fontWeight: '600', flex: 1 },
    itemsContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 },
    itemsHeader: { flexDirection: 'row', marginBottom: 4 },
    itemCol: { flex: 1, fontSize: 10, color: '#888', fontWeight: '600' },
    itemRow: { flexDirection: 'row', paddingVertical: 3 },
    itemText: { flex: 1, fontSize: 11, color: '#333' },
    itemRight: { textAlign: 'right' },
    tapHint: { fontSize: 10, color: '#aaa', textAlign: 'right', marginTop: 6 },
    errorText: { color: '#c62828', textAlign: 'center', marginBottom: 12 },
    retryBtn: { backgroundColor: '#1565c0', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
    retryText: { color: '#fff', fontWeight: '600' },
    emptyIcon: { fontSize: 40, marginBottom: 8 },
    emptyText: { color: '#888', fontSize: 14 },
});
