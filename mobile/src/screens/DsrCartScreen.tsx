/**
 * DsrCartScreen
 * DSR delivery confirmation — cart-style UI pre-populated from a ScheduleOrder.
 * Per-item: delivered_qty, extra_discount.
 * Financial panel: sum discounts, prev credit, payable, cash collected, credit balance after.
 * Actions: Bounce | Hold | ✓ Confirm
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    TextInput,
    Image,
    Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    ScheduleOrder,
    fetchOutletCredit,
    confirmDelivery,
    bounceOrder,
    holdOrder,
} from '../services/dsrDeliveryAPI';
import salesAPI, { Offer } from '../services/salesAPI';

// ── Local types ───────────────────────────────────────────────────────────────

interface DsrCartItem {
    product_id: string;
    sku: string;
    bangla_name: string;
    english_name: string;
    image_url?: string;
    ordered_qty: number;
    delivered_qty: number;
    unit_price: number;
    extra_discount: number;
    ctn_pcs?: number;
}

interface OfferCartItem {
    offer_id: string;
    offer_name: string;
    product_id: string;
    sku: string;
    english_name: string;
    quantity: number;
}

interface OfferNote {
    offer_id: string;
    text: string;
    qualifies: boolean;
}

type DsrRow =
    | { type: 'section_header'; id: string; title: string; count?: number }
    | { type: 'regular_item'; id: string; index: number }
    | { type: 'offer_item'; id: string; offerItem: OfferCartItem }
    | { type: 'offer_note'; id: string; note: OfferNote }
    | { type: 'total_row'; id: string; total: number }
    | { type: 'financial_card'; id: string };

interface Props {
    route: any;
    navigation: any;
}

// ─────────────────────────────────────────────────────────────────────────────

const DsrCartScreen: React.FC<Props> = ({ route, navigation }) => {
    const { order, distributorId } = route.params as { order: ScheduleOrder; distributorId?: string | null };
    const outletId = order.outlet_id._id;
    const outletName = order.outlet_id.outlet_name;

    // Pre-populate items from order — exclude free items (unit_price === 0) as they
    // are computed dynamically from offers and shown in a separate FREE OFFER ITEMS section
    const [items, setItems] = useState<DsrCartItem[]>(() =>
        order.items.filter(item => item.unit_price > 0).map(item => ({
            product_id: (item.product_id?._id ?? item.product_id) as string,
            sku: item.sku,
            bangla_name: item.product_id?.bangla_name ?? item.bangla_name ?? '',
            english_name: item.product_id?.english_name ?? item.english_name ?? '',
            image_url: item.product_id?.image_url ?? item.image_url,
            ordered_qty: item.ordered_qty ?? (item as any).quantity ?? 0,
            delivered_qty: item.ordered_qty ?? (item as any).quantity ?? 0,
            unit_price: item.unit_price,
            extra_discount: 0,
            ctn_pcs: item.ctn_pcs,
        }))
    );

    const [creditBalanceBefore, setCreditBalanceBefore] = useState(0);
    const [cashCollected, setCashCollected] = useState('0');
    const [submitting, setSubmitting] = useState(false);
    const [language, setLanguage] = useState<'bn' | 'en'>('bn');
    const [offers, setOffers] = useState<Offer[]>([]);

    // Reason modal
    const [reasonModalVisible, setReasonModalVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<'bounce' | 'hold'>('bounce');
    const [reason, setReason] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                const [savedLang, credit] = await Promise.all([
                    AsyncStorage.getItem('@lang_pref'),
                    fetchOutletCredit(outletId),
                ]);
                if (savedLang) setLanguage(savedLang as 'bn' | 'en');
                setCreditBalanceBefore(credit);

                // Fetch offers for free-item computation
                const token = await AsyncStorage.getItem('accessToken');
                if (token && distributorId) {
                    const fetchedOffers = await salesAPI.getOffers(token, outletId, distributorId);
                    setOffers(fetchedOffers);
                }
            } catch {
                // non-fatal — continue with defaults
            }
        };
        init();
    }, [outletId]);

    const productDisplayName = (item: DsrCartItem) =>
        language === 'bn' ? item.bangla_name : item.english_name;

    const updateItem = useCallback((index: number, field: keyof DsrCartItem, value: number) => {
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }, []);

    // ── Computed free offer items (BUY_X_GET_1_FREE) ──────────────
    const computedOfferItems = useMemo<OfferCartItem[]>(() => {
        const result: OfferCartItem[] = [];
        for (const offer of offers) {
            if (offer.offer_type !== 'BUY_X_GET_1_FREE' || !offer.skuFreeItems) { continue; }
            for (const freeItem of offer.skuFreeItems) {
                let totalQty = 0;
                for (const ci of items) {
                    if (ci.product_id === freeItem.productId) { totalQty += ci.delivered_qty; }
                }
                const freeQty = Math.floor(totalQty / freeItem.buyQty);
                if (freeQty > 0) {
                    result.push({
                        offer_id: offer._id,
                        offer_name: offer.name,
                        product_id: freeItem.productId,
                        sku: freeItem.sku,
                        english_name: freeItem.englishName,
                        quantity: freeQty,
                    });
                }
            }
        }
        return result;
    }, [items, offers]);

    // ── Delivery total (delivered_qty × unit_price) ────────────────
    const deliveryTotal = useMemo(
        () => items.reduce((s, i) => s + i.delivered_qty * i.unit_price, 0),
        [items],
    );

    // ── Sum of per-item extra discounts ───────────────────────────
    const sumExtraDiscounts = useMemo(
        () => items.reduce((s, i) => s + i.extra_discount, 0),
        [items],
    );

    const payable = Math.max(deliveryTotal - sumExtraDiscounts, 0);
    const totalPayable = payable + creditBalanceBefore;
    const creditBalanceAfter = totalPayable - Number(cashCollected || 0);

    // ── Offer notes ────────────────────────────────────────────────
    const offerNotes = useMemo<OfferNote[]>(() => {
        const notes: OfferNote[] = [];
        for (const offer of offers) {
            if (offer.offer_type === 'BUY_X_GET_1_FREE') { continue; }

            if (offer.offer_type === 'DISCOUNT_SLAB_PCT' && offer.config.slabs?.length) {
                const slabs = [...offer.config.slabs].sort((a, b) => a.minValue - b.minValue);
                const activeSlab = [...slabs].reverse().find(
                    s => deliveryTotal >= s.minValue && deliveryTotal <= (s.maxValue ?? Infinity),
                );
                if (activeSlab) {
                    const discountAmt = (deliveryTotal * (activeSlab.discountPercentage ?? 0)) / 100;
                    const nextSlab = slabs.find(s => s.minValue > deliveryTotal);
                    const extra = nextSlab ? ` | Add ৳${(nextSlab.minValue - deliveryTotal).toFixed(2)} for ${nextSlab.discountPercentage}%` : '';
                    notes.push({ offer_id: `${offer._id}_active`, text: `✓ "${offer.name}": ${activeSlab.discountPercentage}% off → ৳${discountAmt.toFixed(2)}${extra}`, qualifies: true });
                } else {
                    const firstSlab = slabs[0];
                    const needed = firstSlab.minValue - deliveryTotal;
                    notes.push({ offer_id: `${offer._id}_nq`, text: `Add ৳${needed.toFixed(2)} more for ${firstSlab.discountPercentage}% off ("${offer.name}")`, qualifies: false });
                }
                continue;
            }

            if (offer.offer_type === 'CASHBACK' && offer.config.cashbackPercentage != null) {
                const minVal = offer.config.minOrderValue ?? 0;
                if (deliveryTotal >= minVal) {
                    let cashback = (deliveryTotal * offer.config.cashbackPercentage) / 100;
                    if (offer.config.maxCashback && cashback > offer.config.maxCashback) { cashback = offer.config.maxCashback; }
                    notes.push({ offer_id: offer._id, text: `✓ "${offer.name}": ৳${cashback.toFixed(2)} cashback (${offer.config.cashbackPercentage}%)`, qualifies: true });
                } else {
                    notes.push({ offer_id: offer._id, text: `Add ৳${(minVal - deliveryTotal).toFixed(2)} more for ${offer.config.cashbackPercentage}% cashback ("${offer.name}")`, qualifies: false });
                }
                continue;
            }

            if (offer.config.minOrderValue != null) {
                const minVal = offer.config.minOrderValue;
                const qualifies = deliveryTotal >= minVal;
                if (qualifies) {
                    if (offer.config.discountPercentage) {
                        const discountAmt = (deliveryTotal * offer.config.discountPercentage) / 100;
                        notes.push({ offer_id: offer._id, text: `✓ "${offer.name}": ${offer.config.discountPercentage}% off → ৳${discountAmt.toFixed(2)}`, qualifies: true });
                    } else if (offer.config.discountAmount) {
                        notes.push({ offer_id: offer._id, text: `✓ "${offer.name}": ৳${offer.config.discountAmount} discount`, qualifies: true });
                    } else {
                        notes.push({ offer_id: offer._id, text: `✓ "${offer.name}" applies`, qualifies: true });
                    }
                } else {
                    notes.push({ offer_id: offer._id, text: `Add ৳${(minVal - deliveryTotal).toFixed(2)} more to qualify for "${offer.name}"`, qualifies: false });
                }
            }
        }
        return notes;
    }, [offers, deliveryTotal]);

    // ── handleConfirm ─────────────────────────────────────────────
    const handleConfirm = async () => {
        if (items.every(i => i.delivered_qty === 0)) {
            Alert.alert('No Delivery', 'All delivered quantities are 0. Use Bounce instead.');
            return;
        }
        Alert.alert('Confirm Delivery', `Deliver ৳${payable.toFixed(2)} to ${outletName}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm',
                onPress: async () => {
                    setSubmitting(true);
                    try {
                        const confirmedData = await confirmDelivery(order._id, {
                            delivery_items: items.map(i => ({
                                product_id: i.product_id,
                                sku: i.sku,
                                ordered_qty: i.ordered_qty,
                                delivered_qty: i.delivered_qty,
                                damage_qty: 0,
                                unit_price: i.unit_price,
                                extra_item_discount: i.extra_discount,
                                is_extra_item: false,
                            })),
                            extra_delivery_discount: sumExtraDiscounts,
                            cash_collected: Number(cashCollected || 0),
                            credit_balance_before: creditBalanceBefore,
                        });
                        const cashIn = confirmedData?.cash_collected ?? Number(cashCollected || 0);
                        const creditAfter = confirmedData?.credit_balance_after ?? creditBalanceAfter;
                        navigation.replace('DsrMemo', {
                            outletName,
                            orderNumber: order.order_number ?? order._id,
                            confirmedAt: new Date().toISOString(),
                            result: {
                                delivery_items: items.map(i => ({
                                    sku: i.sku,
                                    english_name: i.english_name,
                                    bangla_name: i.bangla_name,
                                    ordered_qty: i.ordered_qty,
                                    delivered_qty: i.delivered_qty,
                                    unit_price: i.unit_price,
                                    extra_discount: i.extra_discount,
                                })),
                                offer_items: computedOfferItems.map(oi => ({
                                    offer_name: oi.offer_name,
                                    english_name: oi.english_name,
                                    quantity: oi.quantity,
                                })),
                                delivery_total: deliveryTotal,
                                extra_delivery_discount: sumExtraDiscounts,
                                payable,
                                cash_collected: cashIn,
                                credit_balance_before: creditBalanceBefore,
                                credit_balance_after: creditAfter,
                            },
                        });
                    } catch (err: any) {
                        const msg = err.message || 'Confirm failed';
                        const alreadyDone = msg.toLowerCase().includes('cannot confirm') || msg.toLowerCase().includes('already');
                        Alert.alert(
                            alreadyDone ? 'Already Submitted' : 'Error',
                            alreadyDone ? 'This order has already been processed today.' : msg,
                            alreadyDone ? [{ text: 'OK', onPress: () => navigation.popToTop() }] : undefined,
                        );
                    } finally {
                        setSubmitting(false);
                    }
                },
            },
        ]);
    };

    // ── handleReasonSubmit ────────────────────────────────────────
    const handleReasonSubmit = async () => {
        if (!reason.trim()) { return; }
        setSubmitting(true);
        try {
            if (pendingAction === 'bounce') {
                await bounceOrder(order._id, reason.trim());
                setReasonModalVisible(false);
                Alert.alert('Bounced', `${outletName} — order bounced.`, [
                    { text: 'OK', onPress: () => navigation.popToTop() },
                ]);
            } else {
                await holdOrder(order._id, reason.trim());
                setReasonModalVisible(false);
                Alert.alert('On Hold', `${outletName} — order put on hold.`, [
                    { text: 'OK', onPress: () => navigation.popToTop() },
                ]);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Action failed');
        } finally {
            setSubmitting(false);
        }
    };

    // ── FlatList data ─────────────────────────────────────────────
    const flatListData = useMemo<DsrRow[]>(() => {
        const rows: DsrRow[] = [];

        rows.push({ type: 'section_header', id: 'sh_items', title: 'ORDER ITEMS', count: items.length });
        items.forEach((_, idx) => {
            rows.push({ type: 'regular_item', id: `ri_${idx}`, index: idx });
        });

        if (computedOfferItems.length > 0) {
            rows.push({ type: 'section_header', id: 'sh_offers', title: 'FREE OFFER ITEMS', count: computedOfferItems.length });
            computedOfferItems.forEach(offerItem => {
                rows.push({ type: 'offer_item', id: `oi_${offerItem.offer_id}_${offerItem.product_id}`, offerItem });
            });
        }

        rows.push({ type: 'total_row', id: 'total', total: deliveryTotal });

        rows.push({ type: 'financial_card', id: 'fin' });

        offerNotes.forEach(note => {
            rows.push({ type: 'offer_note', id: `on_${note.offer_id}`, note });
        });

        return rows;
    }, [items, computedOfferItems, deliveryTotal, offerNotes]);

    // ── renderRow ─────────────────────────────────────────────────
    const renderRow = ({ item }: { item: DsrRow }) => {
        switch (item.type) {

            case 'section_header':
                return (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{item.title}</Text>
                        {item.count != null && (
                            <View style={styles.sectionHeaderBadge}>
                                <Text style={styles.sectionHeaderBadgeText}>{item.count}</Text>
                            </View>
                        )}
                    </View>
                );

            case 'regular_item': {
                const ci = items[item.index];
                const idx = item.index;
                const ctnWhole = (ci.ctn_pcs && ci.ctn_pcs > 0) ? Math.floor(ci.delivered_qty / ci.ctn_pcs) : 0;
                const ctnVal = ctnWhole > 0
                    ? `${ctnWhole}.${ci.delivered_qty % ci.ctn_pcs}`
                    : null;
                return (
                    <View style={styles.regularRow}>
                        {ci.image_url
                            ? <Image source={{ uri: ci.image_url }} style={styles.productImage} />
                            : (
                                <View style={styles.productImagePlaceholder}>
                                    <MaterialIcons name="image-not-supported" size={28} color="#ccc" />
                                </View>
                            )
                        }
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={2}>{productDisplayName(ci)}</Text>
                            <Text style={styles.itemSku}>SKU: {ci.sku}</Text>
                            <Text style={styles.itemPrice}>৳{ci.unit_price.toFixed(2)} / pc</Text>
                            <Text style={styles.orderedQty}>Ordered: {ci.ordered_qty} pcs</Text>
                            {ctnVal !== null && <Text style={styles.ctnLabel}>CTN: {ctnVal}</Text>}
                        </View>
                        <View style={styles.itemRight}>
                            <Text style={styles.fieldLabel}>Delivered</Text>
                            <View style={styles.qtyControl}>
                                <TouchableOpacity onPress={() => updateItem(idx, 'delivered_qty', Math.max(ci.delivered_qty - 1, 0))}>
                                    <MaterialIcons
                                        name="remove-circle-outline"
                                        size={26}
                                        color={ci.delivered_qty <= 0 ? '#ccc' : '#e53935'}
                                    />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.qtyInput}
                                    keyboardType="number-pad"
                                    value={String(ci.delivered_qty)}
                                    maxLength={6}
                                    onChangeText={t => {
                                        const v = parseInt(t, 10);
                                        updateItem(idx, 'delivered_qty', isNaN(v) ? 0 : Math.max(v, 0));
                                    }}
                                />
                                <TouchableOpacity onPress={() => updateItem(idx, 'delivered_qty', ci.delivered_qty + 1)}>
                                    <MaterialIcons name="add-circle-outline" size={26} color="#43a047" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.itemSubtotal}>৳{(ci.delivered_qty * ci.unit_price).toFixed(2)}</Text>
                            <View style={styles.extraFields}>
                                <View style={styles.extraFieldBlock}>
                                    <Text style={styles.extraFieldLabel}>Extra Discount</Text>
                                    <TextInput
                                        style={[styles.extraInput, styles.discInput]}
                                        keyboardType="number-pad"
                                        value={ci.extra_discount > 0 ? String(ci.extra_discount) : ''}
                                        placeholder="0"
                                        placeholderTextColor="#aaa"
                                        maxLength={6}
                                        onChangeText={t => {
                                            const v = parseInt(t, 10);
                                            updateItem(idx, 'extra_discount', isNaN(v) ? 0 : Math.max(v, 0));
                                        }}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                );
            }

            case 'offer_item': {
                const { offerItem } = item;
                return (
                    <View style={styles.offerRow}>
                        <View style={styles.freeBadge}>
                            <Text style={styles.freeBadgeText}>FREE</Text>
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{offerItem.english_name}</Text>
                            <Text style={styles.itemSku}>SKU: {offerItem.sku}</Text>
                            <Text style={styles.offerSourceText}>{offerItem.offer_name}</Text>
                        </View>
                        <View style={styles.itemRight}>
                            <Text style={styles.offerQty}>× {offerItem.quantity}</Text>
                            <Text style={styles.offerZeroPrice}>৳0.00</Text>
                        </View>
                    </View>
                );
            }

            case 'total_row':
                return (
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Delivery Total</Text>
                        <Text style={styles.totalValue}>৳{item.total.toFixed(2)}</Text>
                    </View>
                );

            case 'offer_note':
                return (
                    <View style={[styles.offerNoteRow, item.note.qualifies && styles.offerNoteQualified]}>
                        <MaterialIcons
                            name={item.note.qualifies ? 'check-circle' : 'info-outline'}
                            size={16}
                            color={item.note.qualifies ? '#2e7d32' : '#f57c00'}
                            style={{ marginRight: 8, marginTop: 1 }}
                        />
                        <Text style={[styles.offerNoteText, item.note.qualifies && styles.offerNoteTextQualified]}>
                            {item.note.text}
                        </Text>
                    </View>
                );

            case 'financial_card':
                return (
                    <View style={styles.financialCard}>
                        <FinRow label="Extra Discounts (Σ)" value={`৳${sumExtraDiscounts.toFixed(2)}`} valueColor="#e53935" />
                        <FinRow label="Prev. Credit Balance" value={`৳${creditBalanceBefore.toFixed(2)}`} />
                        <View style={styles.financialDivider} />
                        <FinRow label="Payable" value={`৳${payable.toFixed(2)}`} bold />
                        <FinRow label="Total Payable" value={`৳${totalPayable.toFixed(2)}`} bold valueColor="#1565c0" />
                        <View style={styles.financialDivider} />
                        <View style={styles.finInputRow}>
                            <Text style={styles.finLabel}>Cash Collected</Text>
                            <TextInput
                                style={styles.finInput}
                                keyboardType="number-pad"
                                value={cashCollected}
                                onChangeText={setCashCollected}
                                placeholder="0"
                                placeholderTextColor="#aaa"
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.finInputRow}
                            onPress={() => setCashCollected(totalPayable.toFixed(2))}
                            activeOpacity={0.6}
                        >
                            <Text style={[styles.finLabel, { textDecorationLine: 'underline' }]}>Credit Balance After</Text>
                            <Text style={[
                                styles.finValue,
                                { color: creditBalanceAfter > 0.01 ? '#c62828' : '#2e7d32', fontWeight: '700', textDecorationLine: 'underline' },
                            ]}>
                                ৳{creditBalanceAfter.toFixed(2)}
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.finTip}>↑ Tap to auto-fill cash</Text>
                    </View>
                );

            default:
                return null;
        }
    };

    // ── render ────────────────────────────────────────────────────
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{outletName}</Text>
                    <Text style={styles.headerSubtitle}>#{order.order_number}</Text>
                </View>
            </View>

            <FlatList
                style={{ flex: 1 }}
                data={flatListData}
                keyExtractor={row => row.id}
                renderItem={renderRow}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
            />

            {/* Action bar */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.btnBounce]}
                    onPress={() => { setPendingAction('bounce'); setReason(''); setReasonModalVisible(true); }}>
                    <Text style={styles.actionBtnText}>Bounce</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.btnHold]}
                    onPress={() => { setPendingAction('hold'); setReason(''); setReasonModalVisible(true); }}>
                    <Text style={styles.actionBtnText}>Hold</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.btnConfirm]}
                    onPress={handleConfirm}
                    disabled={submitting}>
                    {submitting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={[styles.actionBtnText, { fontSize: 16 }]}>✓ Confirm</Text>}
                </TouchableOpacity>
            </View>

            {/* Reason modal */}
            <Modal
                visible={reasonModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setReasonModalVisible(false)}>
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
                            placeholderTextColor="#aaa"
                            value={reason}
                            onChangeText={setReason}
                            autoFocus
                        />
                        <View style={styles.reasonButtons}>
                            <TouchableOpacity
                                style={styles.reasonCancel}
                                onPress={() => setReasonModalVisible(false)}>
                                <Text style={{ color: '#555', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.reasonConfirm, pendingAction === 'bounce' ? styles.btnBounce : styles.btnHold]}
                                onPress={handleReasonSubmit}
                                disabled={!reason.trim() || submitting}>
                                {submitting
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={{ color: '#fff', fontWeight: '700' }}>Confirm</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// ── Helper component ──────────────────────────────────────────────────────────
const FinRow: React.FC<{ label: string; value: string; bold?: boolean; valueColor?: string }> = ({ label, value, bold, valueColor }) => (
    <View style={styles.finRow}>
        <Text style={[styles.finLabel, bold && { fontWeight: '700' }]}>{label}</Text>
        <Text style={[styles.finValue, bold && { fontWeight: '700' }, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1565c0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 4,
    },
    headerCenter: { flex: 1, marginLeft: 12 },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#e8eaf6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginTop: 8,
    },
    sectionHeaderText: { fontSize: 12, fontWeight: '700', color: '#3949ab', letterSpacing: 0.8 },
    sectionHeaderBadge: { backgroundColor: '#c5cae9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    sectionHeaderBadgeText: { fontSize: 12, fontWeight: '600', color: '#3949ab' },

    regularRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
    },
    productImage: { width: 56, height: 56, borderRadius: 6, marginRight: 10, backgroundColor: '#f5f5f5' },
    productImagePlaceholder: { width: 56, height: 56, borderRadius: 6, marginRight: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '600', color: '#000' },
    itemSku: { fontSize: 11, color: '#666', marginTop: 2 },
    itemPrice: { fontSize: 12, color: '#555', marginTop: 2 },
    orderedQty: { fontSize: 11, color: '#888', marginTop: 2 },
    ctnLabel: { fontSize: 11, color: '#555', marginTop: 2, fontWeight: '500' },
    itemRight: { alignItems: 'flex-end', marginLeft: 8, minWidth: 120 },
    fieldLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
    qtyControl: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    qtyInput: {
        fontSize: 15,
        fontWeight: 'bold',
        minWidth: 44,
        textAlign: 'center',
        color: '#000',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        paddingVertical: 2,
        paddingHorizontal: 4,
        backgroundColor: '#fff',
        marginHorizontal: 4,
    },
    itemSubtotal: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 6 },
    extraFields: { flexDirection: 'row', gap: 8 },
    extraFieldBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    extraFieldLabel: { fontSize: 12, color: '#555' },
    extraInput: {
        width: 72,
        height: 34,
        textAlign: 'center',
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        backgroundColor: '#fafafa',
    },
    discInput: { borderColor: '#f57c00' },

    offerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f8e9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#dcedc8',
    },
    freeBadge: { backgroundColor: '#2e7d32', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, marginRight: 10, alignSelf: 'flex-start' },
    freeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    offerSourceText: { fontSize: 11, color: '#558b2f', marginTop: 2, fontStyle: 'italic' },
    offerQty: { fontSize: 16, fontWeight: '700', color: '#2e7d32', marginBottom: 4 },
    offerZeroPrice: { fontSize: 13, color: '#aaa', textDecorationLine: 'line-through' },

    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 8,
        borderTopWidth: 2,
        borderTopColor: '#1565c0',
    },
    totalLabel: { fontSize: 16, fontWeight: '700', color: '#000' },
    totalValue: { fontSize: 18, fontWeight: '800', color: '#000' },

    offerNoteRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff3e0', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: '#ffe0b2', marginTop: 2 },
    offerNoteQualified: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
    offerNoteText: { flex: 1, fontSize: 13, color: '#e65100' },
    offerNoteTextQualified: { color: '#2e7d32' },

    financialCard: {
        margin: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        elevation: 2,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
    finLabel: { fontSize: 14, color: '#555' },
    finValue: { fontSize: 14, color: '#222' },
    financialDivider: { borderTopWidth: 1, borderColor: '#e0e0e0', marginVertical: 4 },
    finInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
    finInput: {
        borderWidth: 2,
        borderColor: '#43a047',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        minWidth: 100,
        textAlign: 'right',
        fontSize: 15,
        color: '#111',
        fontWeight: '600',
    },
    finTip: { fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 4 },

    actionBar: {
        flexDirection: 'row',
        padding: 10,
        gap: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#eee',
        elevation: 8,
    },
    actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    btnBounce: { backgroundColor: '#c62828' },
    btnHold: { backgroundColor: '#f57c00' },
    btnConfirm: { flex: 1.4, backgroundColor: '#2e7d32' },

    reasonOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    reasonCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
    reasonTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1a1a2e' },
    reasonInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', color: '#111' },
    reasonButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    reasonCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
    reasonConfirm: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});

export default DsrCartScreen;
