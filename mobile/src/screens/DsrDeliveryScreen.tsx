import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import {
    fetchSchedule,
    fetchOutletCredit,
    searchCatalog,
    confirmDelivery,
    bounceOrder,
    holdOrder,
    ScheduleOrder,
    CatalogProduct,
} from '../services/dsrDeliveryAPI';
import { useFocusEffect } from '@react-navigation/native';

type OrderStatus = 'Approved' | 'Hold' | 'Delivered' | 'Bounced';

interface DeliveryRow {
    product_id: string;
    sku: string;
    bangla_name: string;
    english_name: string;
    image_url?: string;
    ordered_qty: number;
    delivered_qty: number;
    damage_qty: number;
    unit_price: number;
    extra_item_discount: number;
    is_extra_item: boolean;
}

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
    const [selectedOrder, setSelectedOrder] = useState<ScheduleOrder | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Modal state
    const [deliveryRows, setDeliveryRows] = useState<DeliveryRow[]>([]);
    const [cashCollected, setCashCollected] = useState('0');
    const [creditBalanceBefore, setCreditBalanceBefore] = useState(0);
    const [extraDeliveryDiscount, setExtraDeliveryDiscount] = useState('0');
    const [submitting, setSubmitting] = useState(false);
    const [reasonModalVisible, setReasonModalVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<'bounce' | 'hold' | null>(null);
    const [reason, setReason] = useState('');
    const [addSkuVisible, setAddSkuVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);

    // Derived financials
    const totalOrderValue = deliveryRows.reduce(
        (sum, r) => sum + r.delivered_qty * r.unit_price - r.extra_item_discount, 0
    );
    const payable = totalOrderValue - Number(extraDeliveryDiscount || 0);
    const totalPayable = payable + creditBalanceBefore;
    const creditBalanceAfter = totalPayable - Number(cashCollected || 0);

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

    const openModal = async (order: ScheduleOrder) => {
        setSelectedOrder(order);
        const rows: DeliveryRow[] = order.items.map(item => ({
            product_id: (item.product_id?._id ?? item.product_id) as string,
            sku: item.sku,
            bangla_name: item.product_id?.bangla_name ?? item.bangla_name ?? '',
            english_name: item.product_id?.english_name ?? item.english_name ?? '',
            image_url: item.product_id?.image_url,
            ordered_qty: item.ordered_qty ?? (item as any).quantity ?? 0,
            delivered_qty: item.ordered_qty ?? (item as any).quantity ?? 0,
            damage_qty: 0,
            unit_price: item.unit_price,
            extra_item_discount: 0,
            is_extra_item: false,
        }));
        setDeliveryRows(rows);
        setCashCollected('0');
        setExtraDeliveryDiscount('0');
        setReason('');

        try {
            const credit = await fetchOutletCredit(order.outlet_id._id);
            setCreditBalanceBefore(credit);
        } catch {
            setCreditBalanceBefore(0);
        }

        setModalVisible(true);
    };

    const updateRow = (index: number, field: keyof DeliveryRow, value: any) => {
        setDeliveryRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeRow = (index: number) => {
        setDeliveryRows(prev => prev.filter((_, i) => i !== index));
    };

    const addExtraProduct = (product: CatalogProduct) => {
        const newRow: DeliveryRow = {
            product_id: product._id,
            sku: product.sku,
            bangla_name: product.bangla_name,
            english_name: product.english_name,
            image_url: product.image_url,
            ordered_qty: 0,
            delivered_qty: 1,
            damage_qty: 0,
            unit_price: product.trade_price,
            extra_item_discount: 0,
            is_extra_item: true,
        };
        setDeliveryRows(prev => [...prev, newRow]);
        setAddSkuVisible(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleConfirm = async () => {
        if (!selectedOrder) return;
        if (deliveryRows.every(r => r.delivered_qty === 0)) {
            Alert.alert('No Items', 'All delivered quantities are 0. Use Bounce instead.');
            return;
        }
        setSubmitting(true);
        try {
            await confirmDelivery(selectedOrder._id, {
                delivery_items: deliveryRows.map(r => ({ ...r })),
                extra_delivery_discount: Number(extraDeliveryDiscount || 0),
                cash_collected: Number(cashCollected || 0),
                credit_balance_before: creditBalanceBefore,
            });
            setModalVisible(false);
            Alert.alert('Delivered ✓', `${selectedOrder.outlet_id.name} — delivery confirmed.`);
            await loadSchedule();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Confirm failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReasonSubmit = async () => {
        if (!selectedOrder || !reason.trim()) return;
        setSubmitting(true);
        try {
            if (pendingAction === 'bounce') {
                await bounceOrder(selectedOrder._id, reason.trim());
                setReasonModalVisible(false);
                setModalVisible(false);
                Alert.alert('Bounced', `${selectedOrder.outlet_id.name} — order bounced.`);
            } else if (pendingAction === 'hold') {
                await holdOrder(selectedOrder._id, reason.trim());
                setReasonModalVisible(false);
                setModalVisible(false);
                Alert.alert('On Hold', `${selectedOrder.outlet_id.name} — order put on hold.`);
            }
            await loadSchedule();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Action failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Summary counts
    const total = orders.length;
    const pending = orders.filter(o => o.order_status === 'Approved').length;
    const confirmed = orders.filter(o => o.order_status === 'Delivered').length;
    const bounced = orders.filter(o => o.order_status === 'Bounced').length;

    const renderOutletCard = ({ item }: { item: ScheduleOrder }) => (
        <TouchableOpacity
            style={[styles.outletCard, { borderLeftColor: statusColor[item.order_status] }]}
            onPress={() => openModal(item)}
            activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
                <Text style={styles.outletName}>{item.outlet_id.name}</Text>
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

    const renderProductRow = (row: DeliveryRow, index: number) => (
        <View key={row.sku + index} style={styles.productRow}>
            <Image
                source={row.image_url ? { uri: row.image_url } : require('../assets/images/default-product.png')}
                style={styles.productThumb}
            />
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{row.bangla_name}</Text>
                <Text style={styles.productSku}>{row.sku}  ৳{row.unit_price}</Text>
                {row.is_extra_item && <Text style={styles.extraBadge}>Extra</Text>}
            </View>

            <View style={styles.qtyBlock}>
                <Text style={styles.qtyLabel}>Ordered</Text>
                <Text style={styles.qtyValue}>{row.ordered_qty}</Text>
            </View>

            <View style={styles.qtyBlock}>
                <Text style={styles.qtyLabel}>Delivered</Text>
                <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={String(row.delivered_qty)}
                    onChangeText={v => updateRow(index, 'delivered_qty', Number(v) || 0)}
                />
            </View>

            <View style={styles.qtyBlock}>
                <Text style={styles.qtyLabel}>Damage</Text>
                <TextInput
                    style={[styles.qtyInput, row.damage_qty > 0 && styles.qtyInputWarning]}
                    keyboardType="numeric"
                    value={String(row.damage_qty)}
                    onChangeText={v => updateRow(index, 'damage_qty', Number(v) || 0)}
                />
            </View>

            <View style={styles.qtyBlock}>
                <Text style={styles.qtyLabel}>ExDisc</Text>
                <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={String(row.extra_item_discount)}
                    onChangeText={v => updateRow(index, 'extra_item_discount', Number(v) || 0)}
                />
            </View>

            <View style={[styles.qtyBlock, { minWidth: 60 }]}>
                <Text style={styles.qtyLabel}>Total</Text>
                <Text style={styles.qtyTotal}>
                    ৳{(row.delivered_qty * row.unit_price - row.extra_item_discount).toFixed(0)}
                </Text>
            </View>

            {row.is_extra_item && (
                <TouchableOpacity onPress={() => removeRow(index)} style={{ padding: 4 }}>
                    <Text style={{ color: '#c62828', fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
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

            {/* Delivery modal */}
            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                    {/* Modal header */}
                    <View style={[styles.header, { paddingVertical: 12 }]}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 22 }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.headerTitle} numberOfLines={1}>
                                {selectedOrder?.outlet_id.name}
                            </Text>
                            <Text style={{ color: '#b3c5ff', fontSize: 11 }}>
                                #{selectedOrder?.order_number}
                            </Text>
                        </View>
                    </View>

                    <ScrollView>
                        {/* Product rows — horizontal scroll */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View>
                                {deliveryRows.map((row, idx) => renderProductRow(row, idx))}
                            </View>
                        </ScrollView>

                        {/* Add Extra SKU button */}
                        <TouchableOpacity
                            style={styles.addSkuBtn}
                            onPress={() => setAddSkuVisible(true)}>
                            <Text style={{ color: '#1565c0', fontWeight: '700' }}>+ Add Extra SKU</Text>
                        </TouchableOpacity>

                        {/* Financial card */}
                        <View style={styles.financialCard}>
                            <View style={styles.financialRow}>
                                <Text style={styles.finLabel}>Total Delivered</Text>
                                <Text style={styles.finValue}>৳{totalOrderValue.toFixed(2)}</Text>
                            </View>
                            <View style={styles.financialRow}>
                                <Text style={styles.finLabel}>Extra Discount</Text>
                                <TextInput
                                    style={styles.finInput}
                                    keyboardType="numeric"
                                    value={extraDeliveryDiscount}
                                    onChangeText={setExtraDeliveryDiscount}
                                    placeholder="0"
                                />
                            </View>
                            <View style={[styles.financialRow, styles.financialDivider]}>
                                <Text style={[styles.finLabel, { fontWeight: '700' }]}>Payable</Text>
                                <Text style={[styles.finValue, { color: '#1565c0', fontWeight: '700' }]}>
                                    ৳{payable.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.financialRow}>
                                <Text style={styles.finLabel}>Prev. Credit</Text>
                                <Text style={styles.finValue}>৳{creditBalanceBefore.toFixed(2)}</Text>
                            </View>
                            <View style={styles.financialRow}>
                                <Text style={[styles.finLabel, { fontWeight: '700' }]}>Total Payable</Text>
                                <Text style={[styles.finValue, { fontWeight: '700' }]}>৳{totalPayable.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.financialRow, styles.financialHighlight]}>
                                <Text style={styles.finLabel}>Cash Collected</Text>
                                <TextInput
                                    style={[styles.finInput, styles.finInputCash]}
                                    keyboardType="numeric"
                                    value={cashCollected}
                                    onChangeText={setCashCollected}
                                    placeholder="0"
                                />
                            </View>
                            <View style={styles.financialRow}>
                                <Text style={styles.finLabel}>Credit Balance</Text>
                                <Text style={[
                                    styles.finValue,
                                    { color: creditBalanceAfter > 0 ? '#c62828' : '#2e7d32', fontWeight: '700' },
                                ]}>
                                    ৳{creditBalanceAfter.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.btnBounced]}
                            onPress={() => { setPendingAction('bounce'); setReasonModalVisible(true); }}>
                            <Text style={styles.actionBtnText}>Bounced</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.btnHold]}
                            onPress={() => { setPendingAction('hold'); setReasonModalVisible(true); }}>
                            <Text style={styles.actionBtnText}>Hold</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.btnConfirm]}
                            onPress={handleConfirm}
                            disabled={submitting}>
                            {submitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={[styles.actionBtnText, { fontSize: 16 }]}>✓ Confirm</Text>}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Reason modal (Bounce / Hold) */}
            <Modal visible={reasonModalVisible} transparent animationType="fade">
                <View style={styles.reasonOverlay}>
                    <View style={styles.reasonCard}>
                        <Text style={styles.reasonTitle}>
                            {pendingAction === 'bounce' ? 'Reason for Bounce' : 'Reason for Hold'}
                        </Text>
                        <TextInput
                            style={styles.reasonInput}
                            multiline
                            numberOfLines={3}
                            placeholder="Enter reason..."
                            value={reason}
                            onChangeText={setReason}
                        />
                        <View style={styles.reasonButtons}>
                            <TouchableOpacity
                                style={styles.reasonCancel}
                                onPress={() => setReasonModalVisible(false)}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.reasonConfirm,
                                    pendingAction === 'bounce' ? styles.btnBounced : styles.btnHold,
                                ]}
                                onPress={handleReasonSubmit}
                                disabled={!reason.trim() || submitting}>
                                {submitting
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={{ color: '#fff' }}>Confirm</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Extra SKU bottom sheet */}
            <Modal visible={addSkuVisible} transparent animationType="slide">
                <View style={{ flex: 1 }}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setAddSkuVisible(false)}
                    />
                    <View style={styles.addSkuSheet}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search SKU or product name..."
                            value={searchQuery}
                            onChangeText={async q => {
                                setSearchQuery(q);
                                if (q.length >= 2) {
                                    try {
                                        const results = await searchCatalog(q);
                                        setSearchResults(results);
                                    } catch {
                                        setSearchResults([]);
                                    }
                                } else {
                                    setSearchResults([]);
                                }
                            }}
                            autoFocus
                        />
                        <FlatList
                            data={searchResults}
                            keyExtractor={p => p._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.searchResultRow}
                                    onPress={() => addExtraProduct(item)}>
                                    <Text style={styles.searchResultName}>{item.bangla_name}</Text>
                                    <Text style={styles.searchResultSku}>{item.sku}  —  ৳{item.trade_price}</Text>
                                    <Text style={styles.searchResultStock}>Stock: {item.available_qty} pcs</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setAddSkuVisible(false)}>
                            <Text style={{ color: '#1565c0', fontWeight: '700' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    outletCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
    outletName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
    outletAddress: { fontSize: 12, color: '#666', marginTop: 2 },
    outletOrderNum: { fontSize: 11, color: '#999', marginTop: 4 },
    statusChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
    statusChipText: { fontSize: 11, fontWeight: '700' },
    orderAmount: { fontSize: 16, fontWeight: '700', color: '#1a237e' },
    orderPcs: { fontSize: 12, color: '#777', marginTop: 2 },

    // Product row
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fff' },
    productThumb: { width: 42, height: 42, borderRadius: 6, marginRight: 10, backgroundColor: '#eee' },
    productInfo: { width: 120, marginRight: 8 },
    productName: { fontSize: 12, fontWeight: '600', color: '#222' },
    productSku: { fontSize: 10, color: '#777', marginTop: 2 },
    extraBadge: { fontSize: 9, color: '#fff', backgroundColor: '#1565c0', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, alignSelf: 'flex-start', marginTop: 2 },
    qtyBlock: { alignItems: 'center', minWidth: 52, marginHorizontal: 4 },
    qtyLabel: { fontSize: 9, color: '#999', marginBottom: 4 },
    qtyValue: { fontSize: 14, color: '#444' },
    qtyInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, textAlign: 'center', width: 48, height: 34, fontSize: 14, backgroundColor: '#fafafa', color: '#111' },
    qtyInputWarning: { borderColor: '#f57c00', backgroundColor: '#fff3e0' },
    qtyTotal: { fontSize: 13, fontWeight: '700', color: '#1a237e' },

    // Add SKU button
    addSkuBtn: { margin: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1565c0', borderRadius: 8, borderStyle: 'dashed' },

    // Financial card
    financialCard: { margin: 12, backgroundColor: '#fff', borderRadius: 12, elevation: 2, padding: 16 },
    financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    financialDivider: { borderTopWidth: 1, borderColor: '#e0e0e0', marginTop: 4, paddingTop: 10 },
    financialHighlight: { backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 },
    finLabel: { fontSize: 14, color: '#555' },
    finValue: { fontSize: 14, color: '#222' },
    finInput: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, minWidth: 80, textAlign: 'right', fontSize: 14, color: '#111' },
    finInputCash: { borderColor: '#43a047', borderWidth: 2 },

    // Action buttons
    actionRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
    actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    btnBounced: { backgroundColor: '#c62828' },
    btnHold: { backgroundColor: '#f57c00' },
    btnConfirm: { backgroundColor: '#2e7d32', flex: 1.4 },

    // Reason modal
    reasonOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    reasonCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
    reasonTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1a1a2e' },
    reasonInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top' },
    reasonButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    reasonCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
    reasonConfirm: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },

    // Add SKU sheet
    addSkuSheet: { height: '70%' as any, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, elevation: 10 },
    searchInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
    searchResultRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    searchResultName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
    searchResultSku: { fontSize: 12, color: '#666', marginTop: 2 },
    searchResultStock: { fontSize: 12, color: '#2e7d32', marginTop: 2 },
    closeBtn: { alignItems: 'center', padding: 14, marginTop: 8 },
});

export default DsrDeliveryScreen;
