/**
 * Add Outlet Screen
 * Lets a Sales Officer register a new outlet discovered on their current
 * route. GPS is captured automatically and is mandatory — the backend
 * enforces this and creates the outlet in PENDING verification state.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    PermissionsAndroid,
    Modal,
    FlatList,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import outletAPI, {
    OutletTypeOption,
    OutletChannelOption,
    ParentCategoryOption,
} from '../services/outletAPI';
import { friendlyErrorMessage } from '../utils/logger';

const MARKET_TYPE_OPTIONS = [
    { _id: 'Urban', name: 'Urban' },
    { _id: 'Rural', name: 'Rural' },
    { _id: 'Wet Market', name: 'Wet Market' },
    { _id: 'Urban Neighborhood', name: 'Urban Neighborhood' },
];

const PAYMENT_MODE_OPTIONS = [
    { _id: 'Cash', name: 'Cash' },
    { _id: 'Credit', name: 'Credit' },
];

const AddOutletScreen = ({ navigation }: any) => {
    // Form state
    const [outletName, setOutletName] = useState('');
    const [outletNameBangla, setOutletNameBangla] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [marketSize, setMarketSize] = useState('');
    const [comments, setComments] = useState('');

    // Extended fields
    const [shopClass, setShopClass] = useState<'A' | 'B' | 'C' | null>(null);
    const [marketType, setMarketType] = useState<string | null>(null);
    const [categoryCtns, setCategoryCtns] = useState<Record<string, string>>({});
    const [pustiConsumerSales, setPustiConsumerSales] = useState('');
    const [paidDisplayOutlet, setPaidDisplayOutlet] = useState(false);
    const [paidAmount, setPaidAmount] = useState('');
    const [totalMarketSizeRevenue, setTotalMarketSizeRevenue] = useState('');
    const [paymentMode, setPaymentMode] = useState<'Cash' | 'Credit' | null>(null);
    const [parentCategories, setParentCategories] = useState<ParentCategoryOption[]>([]);

    // Dropdowns
    const [outletTypes, setOutletTypes] = useState<OutletTypeOption[]>([]);
    const [outletChannels, setOutletChannels] = useState<OutletChannelOption[]>([]);
    const [selectedType, setSelectedType] = useState<OutletTypeOption | null>(null);
    const [selectedChannel, setSelectedChannel] =
        useState<OutletChannelOption | null>(null);
    const [typePickerOpen, setTypePickerOpen] = useState(false);
    const [channelPickerOpen, setChannelPickerOpen] = useState(false);
    const [marketTypePickerOpen, setMarketTypePickerOpen] = useState(false);
    const [paymentModePickerOpen, setPaymentModePickerOpen] = useState(false);

    // GPS
    const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(
        null,
    );
    const [gpsLoading, setGpsLoading] = useState(false);

    // Submission
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Derived
    const posContribution = useMemo(() => {
        const sales = parseFloat(pustiConsumerSales) || 0;
        const market = parseFloat(totalMarketSizeRevenue) || 0;
        if (market === 0) return null;
        return (sales / market) * 100;
    }, [pustiConsumerSales, totalMarketSizeRevenue]);

    useEffect(() => {
        loadMetadata();
        captureGps();
    }, []);

    const loadMetadata = async () => {
        try {
            setLoadingMeta(true);
            const meta = await outletAPI.getMetadata();
            setOutletTypes(meta.outlet_types);
            setOutletChannels(meta.outlet_channels);
            setParentCategories(meta.parent_categories || []);
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e.message || 'Failed to load form data');
        } finally {
            setLoadingMeta(false);
        }
    };

    const requestLocationPermission = async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return true;
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    };

    const captureGps = async () => {
        const ok = await requestLocationPermission();
        if (!ok) {
            Alert.alert('Permission Required', 'Location permission is required to register an outlet.');
            return;
        }
        setGpsLoading(true);
        Geolocation.getCurrentPosition(
            pos => {
                setGps({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy ?? 0,
                });
                setGpsLoading(false);
            },
            err => {
                console.warn('[AddOutlet] GPS error:', err);
                setGpsLoading(false);
                Alert.alert('GPS Error', friendlyErrorMessage(err, 'Could not get location. Move to an open area.'));
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
    };

    const validate = (): string | null => {
        if (!outletName.trim()) return 'Outlet name is required';
        if (!selectedType) return 'Please select outlet type';
        if (!selectedChannel) return 'Please select outlet channel';
        if (!gps) return 'GPS location is required. Tap "Refresh GPS".';
        if (gps.accuracy > 100) {
            return `GPS accuracy is too low (${Math.round(gps.accuracy)}m). Move to an open area and refresh.`;
        }
        if (mobile && !/^(\+88)?01[3-9]\d{8}$/.test(mobile)) {
            return 'Invalid mobile format. Use 01XXXXXXXXX.';
        }
        return null;
    };

    const handleSubmit = async () => {
        const err = validate();
        if (err) {
            Alert.alert('Validation', err);
            return;
        }
        try {
            setSubmitting(true);
            const categoryMarketSize = parentCategories
                .filter(cat => parseFloat(categoryCtns[cat._id] || '0') > 0)
                .map(cat => ({
                    category_id: cat._id,
                    category_name: cat.name,
                    ctn: parseFloat(categoryCtns[cat._id]) || 0,
                }));
            const res = await outletAPI.registerOutlet({
                outlet_name: outletName.trim(),
                outlet_name_bangla: outletNameBangla.trim() || undefined,
                outlet_type: selectedType!._id,
                outlet_channel_id: selectedChannel!._id,
                contact_person: contactPerson.trim() || undefined,
                mobile: mobile.trim() || undefined,
                address: address.trim() || undefined,
                market_size: marketSize ? Number(marketSize) : undefined,
                comments: comments.trim() || undefined,
                lati: gps!.lat,
                longi: gps!.lng,
                gps_accuracy: gps!.accuracy,
                shop_class: shopClass || undefined,
                market_type: marketType || undefined,
                category_market_size: categoryMarketSize.length > 0 ? categoryMarketSize : undefined,
                pusti_consumer_sales: pustiConsumerSales ? parseFloat(pustiConsumerSales) : undefined,
                pos_contribution: posContribution !== null ? parseFloat(posContribution.toFixed(2)) : undefined,
                paid_display_outlet: paidDisplayOutlet,
                paid_amount: paidDisplayOutlet && paidAmount ? parseFloat(paidAmount) : undefined,
                total_market_size_revenue: totalMarketSizeRevenue ? parseFloat(totalMarketSizeRevenue) : undefined,
                payment_mode: paymentMode || undefined,
            });
            Alert.alert(
                'Registered',
                `Outlet "${res.outlet_name}" (${res.outlet_id}) submitted.\nStatus: ${res.verification_status}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
        } catch (e: any) {
            Alert.alert(
                'Registration Failed',
                e?.response?.data?.message || e.message || 'Could not register outlet.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingMeta) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={{ marginTop: 12, color: '#666' }}>Loading form…</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#f5f5f5' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Outlet</Text>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* GPS card */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Icon name="crosshairs-gps" size={20} color="#4CAF50" />
                        <Text style={styles.cardTitle}>Current Location (auto-captured)</Text>
                    </View>
                    {gpsLoading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                            <ActivityIndicator color="#4CAF50" />
                            <Text style={{ marginLeft: 8, color: '#666' }}>Getting GPS…</Text>
                        </View>
                    ) : gps ? (
                        <View style={{ marginTop: 8 }}>
                            <Text style={styles.gpsText}>
                                📍 {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                            </Text>
                            <Text
                                style={[
                                    styles.gpsAccuracy,
                                    { color: gps.accuracy > 100 ? '#E53935' : '#4CAF50' },
                                ]}>
                                Accuracy: ±{Math.round(gps.accuracy)}m{' '}
                                {gps.accuracy > 100 ? '(too low — refresh)' : '(OK)'}
                            </Text>
                        </View>
                    ) : (
                        <Text style={{ color: '#E53935', marginTop: 8 }}>GPS not available</Text>
                    )}
                    <TouchableOpacity style={styles.refreshBtn} onPress={captureGps} disabled={gpsLoading}>
                        <Icon name="refresh" size={16} color="#fff" />
                        <Text style={styles.refreshBtnText}>Refresh GPS</Text>
                    </TouchableOpacity>
                </View>

                {/* Outlet info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Shop Details</Text>

                    <Text style={styles.label}>Outlet Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={outletName}
                        onChangeText={setOutletName}
                        placeholder="e.g. Karim Store"
                        placeholderTextColor="#999"
                    />

                    <Text style={styles.label}>Outlet Name (Bangla)</Text>
                    <TextInput
                        style={styles.input}
                        value={outletNameBangla}
                        onChangeText={setOutletNameBangla}
                        placeholder="বাংলা নাম"
                        placeholderTextColor="#999"
                    />

                    <Text style={styles.label}>Outlet Type *</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setTypePickerOpen(true)}>
                        <Text style={{ color: selectedType ? '#333' : '#999' }}>
                            {selectedType?.name || 'Select outlet type'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Outlet Channel *</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setChannelPickerOpen(true)}>
                        <Text style={{ color: selectedChannel ? '#333' : '#999' }}>
                            {selectedChannel?.name || 'Select outlet channel'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Contact Person</Text>
                    <TextInput
                        style={styles.input}
                        value={contactPerson}
                        onChangeText={setContactPerson}
                        placeholder="Owner / manager name"
                        placeholderTextColor="#999"
                    />

                    <Text style={styles.label}>Mobile</Text>
                    <TextInput
                        style={styles.input}
                        value={mobile}
                        onChangeText={setMobile}
                        placeholder="01XXXXXXXXX"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        maxLength={14}
                    />

                    <Text style={styles.label}>Address</Text>
                    <TextInput
                        style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Street, area, landmark"
                        placeholderTextColor="#999"
                        multiline
                    />

                    <Text style={styles.label}>Market Size (avg monthly sales, BDT)</Text>
                    <TextInput
                        style={styles.input}
                        value={marketSize}
                        onChangeText={setMarketSize}
                        placeholder="0"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>Remarks</Text>
                    <TextInput
                        style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                        value={comments}
                        onChangeText={setComments}
                        placeholder="Any notes for verification"
                        placeholderTextColor="#999"
                        multiline
                    />
                </View>

                {/* Classification */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Classification</Text>

                    <Text style={styles.label}>Shop Class</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        {(['A', 'B', 'C'] as const).map(cls => (
                            <TouchableOpacity
                                key={cls}
                                style={[styles.classBtn, shopClass === cls && styles.classBtnActive]}
                                onPress={() => setShopClass(shopClass === cls ? null : cls)}>
                                <Text style={[styles.classBtnText, shopClass === cls && styles.classBtnTextActive]}>{cls}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Market Type</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setMarketTypePickerOpen(true)}>
                        <Text style={{ color: marketType ? '#333' : '#999' }}>
                            {marketType || 'Select market type'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Payment Mode</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setPaymentModePickerOpen(true)}>
                        <Text style={{ color: paymentMode ? '#333' : '#999' }}>
                            {paymentMode || 'Select payment mode'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Market Size by Category */}
                {parentCategories.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Market Size (CTN/Month)</Text>
                        {parentCategories.map(cat => (
                            <View key={cat._id} style={styles.categoryRow}>
                                <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                                <TextInput
                                    style={styles.ctnInput}
                                    value={categoryCtns[cat._id] || ''}
                                    onChangeText={text =>
                                        setCategoryCtns(prev => ({ ...prev, [cat._id]: text }))
                                    }
                                    placeholder="0"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                />
                                <Text style={styles.ctnUnit}>CTN</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Sales & POS Contribution */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sales Information</Text>

                    <Text style={styles.label}>Pusti Consumer Sales for Month (Tk)</Text>
                    <TextInput
                        style={styles.input}
                        value={pustiConsumerSales}
                        onChangeText={setPustiConsumerSales}
                        placeholder="0"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>Total Market Size — Pusti &amp; Competitors (BDT)</Text>
                    <TextInput
                        style={styles.input}
                        value={totalMarketSizeRevenue}
                        onChangeText={setTotalMarketSizeRevenue}
                        placeholder="0"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                    />

                    {posContribution !== null && (
                        <View style={styles.posRow}>
                            <Text style={styles.posLabel}>POS Contribution</Text>
                            <Text style={styles.posValue}>{posContribution.toFixed(1)}%</Text>
                        </View>
                    )}

                    <Text style={styles.label}>Paid Display Outlet</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        {(['Yes', 'No'] as const).map(label => (
                            <TouchableOpacity
                                key={label}
                                style={[styles.classBtn, paidDisplayOutlet === (label === 'Yes') && styles.classBtnActive]}
                                onPress={() => setPaidDisplayOutlet(label === 'Yes')}>
                                <Text style={[styles.classBtnText, paidDisplayOutlet === (label === 'Yes') && styles.classBtnTextActive]}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {paidDisplayOutlet && (
                        <>
                            <Text style={styles.label}>Paid Amount (BDT)</Text>
                            <TextInput
                                style={styles.input}
                                value={paidAmount}
                                onChangeText={setPaidAmount}
                                placeholder="0"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </>
                    )}
                </View>

                <View style={styles.notice}>
                    <Icon name="information-outline" size={16} color="#1976d2" />
                    <Text style={styles.noticeText}>
                        New outlets are submitted as <Text style={{ fontWeight: 'bold' }}>Pending</Text> and become
                        orderable once verified by your supervisor.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={submitting}>
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Icon name="store-plus" size={20} color="#fff" />
                            <Text style={styles.submitText}>Submit Registration</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Outlet Type picker */}
            <PickerModal
                visible={typePickerOpen}
                title="Select Outlet Type"
                options={outletTypes}
                selectedId={selectedType?._id}
                onSelect={o => {
                    setSelectedType(o);
                    setTypePickerOpen(false);
                }}
                onClose={() => setTypePickerOpen(false)}
            />

            {/* Channel picker */}
            <PickerModal
                visible={channelPickerOpen}
                title="Select Outlet Channel"
                options={outletChannels}
                selectedId={selectedChannel?._id}
                onSelect={o => {
                    setSelectedChannel(o);
                    setChannelPickerOpen(false);
                }}
                onClose={() => setChannelPickerOpen(false)}
            />

            {/* Market Type picker */}
            <PickerModal
                visible={marketTypePickerOpen}
                title="Select Market Type"
                options={MARKET_TYPE_OPTIONS}
                selectedId={marketType || undefined}
                onSelect={o => {
                    setMarketType(o._id);
                    setMarketTypePickerOpen(false);
                }}
                onClose={() => setMarketTypePickerOpen(false)}
            />

            {/* Payment Mode picker */}
            <PickerModal
                visible={paymentModePickerOpen}
                title="Select Payment Mode"
                options={PAYMENT_MODE_OPTIONS}
                selectedId={paymentMode || undefined}
                onSelect={o => {
                    setPaymentMode(o._id as 'Cash' | 'Credit');
                    setPaymentModePickerOpen(false);
                }}
                onClose={() => setPaymentModePickerOpen(false)}
            />
        </KeyboardAvoidingView>
    );
};

interface PickerItem {
    _id: string;
    name: string;
}

const PickerModal = ({
    visible,
    title,
    options,
    selectedId,
    onSelect,
    onClose,
}: {
    visible: boolean;
    title: string;
    options: PickerItem[];
    selectedId?: string;
    onSelect: (o: PickerItem) => void;
    onClose: () => void;
}) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
                {options.length === 0 ? (
                    <Text style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                        No options available.
                    </Text>
                ) : (
                    <FlatList
                        data={options}
                        keyExtractor={o => o._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.optionRow,
                                    item._id === selectedId && { backgroundColor: '#E8F5E9' },
                                ]}
                                onPress={() => onSelect(item)}>
                                <Text style={styles.optionText}>{item.name}</Text>
                                {item._id === selectedId && (
                                    <Icon name="check" size={20} color="#4CAF50" />
                                )}
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingTop: Platform.OS === 'ios' ? 50 : 14,
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    content: { padding: 12, paddingBottom: 40 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        elevation: 1,
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginLeft: 4 },
    label: { fontSize: 13, color: '#555', marginTop: 12, marginBottom: 6, fontWeight: '600' },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#fafafa',
    },
    gpsText: { fontSize: 14, color: '#333', fontWeight: '600' },
    gpsAccuracy: { fontSize: 12, marginTop: 4 },
    refreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginTop: 12,
        gap: 6,
    },
    refreshBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    notice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        gap: 8,
    },
    noticeText: { flex: 1, color: '#1565c0', fontSize: 12, lineHeight: 16 },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        borderRadius: 10,
        gap: 8,
    },
    submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionText: { fontSize: 15, color: '#333' },
    classBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4CAF50',
        backgroundColor: '#fff',
        minWidth: 52,
        alignItems: 'center',
    },
    classBtnActive: {
        backgroundColor: '#4CAF50',
    },
    classBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },
    classBtnTextActive: {
        color: '#fff',
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 8,
    },
    categoryName: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    ctnInput: {
        width: 72,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        fontSize: 14,
        color: '#333',
        textAlign: 'right',
        backgroundColor: '#fafafa',
    },
    ctnUnit: {
        fontSize: 13,
        color: '#666',
        width: 28,
    },
    posRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
    },
    posLabel: {
        fontSize: 14,
        color: '#2E7D32',
        fontWeight: '600',
    },
    posValue: {
        fontSize: 18,
        color: '#1B5E20',
        fontWeight: 'bold',
    },
});

export default AddOutletScreen;
