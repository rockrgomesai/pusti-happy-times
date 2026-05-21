/**
 * DsrMemoScreen
 * Delivery confirmation memo shown after a DSR confirms a delivery.
 * Displays all delivered items, free offer items, and the financial summary.
 * Actions: Print PDF | Share | Done
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Share,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { generatePDF } from 'react-native-html-to-pdf';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemoDeliveryItem {
    sku: string;
    english_name: string;
    bangla_name: string;
    ordered_qty: number;
    delivered_qty: number;
    unit_price: number;
    extra_discount: number;
}

interface MemoOfferItem {
    offer_name: string;
    english_name: string;
    quantity: number;
}

interface MemoResult {
    delivery_items: MemoDeliveryItem[];
    offer_items: MemoOfferItem[];
    delivery_total: number;
    extra_delivery_discount: number;
    payable: number;
    cash_collected: number;
    credit_balance_before: number;
    credit_balance_after: number;
}

interface Props {
    route: any;
    navigation: any;
}

// ── HTML builder ───────────────────────────────────────────────────────────────

function buildHtml(outletName: string, orderNumber: string, confirmedAt: string, result: MemoResult): string {
    const date = new Date(confirmedAt);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const itemRows = result.delivery_items
        .filter(i => i.delivered_qty > 0)
        .map(i => {
            const lineTotal = i.delivered_qty * i.unit_price - i.extra_discount;
            return `
        <tr>
          <td>${i.english_name}</td>
          <td style="text-align:center">${i.sku}</td>
          <td style="text-align:center">${i.delivered_qty}</td>
          <td style="text-align:right">৳${i.unit_price.toFixed(2)}</td>
          <td style="text-align:right">${i.extra_discount > 0 ? `৳${i.extra_discount.toFixed(2)}` : '—'}</td>
          <td style="text-align:right">৳${lineTotal.toFixed(2)}</td>
        </tr>`;
        })
        .join('');

    const offerRows = result.offer_items.length > 0
        ? result.offer_items.map(o => `
        <tr>
          <td>${o.english_name}</td>
          <td colspan="3" style="text-align:center;color:#15803d">${o.offer_name}</td>
          <td style="text-align:center">${o.quantity}</td>
          <td style="text-align:right;color:#15803d;font-weight:bold">FREE</td>
        </tr>`).join('')
        : '';

    const offerSection = result.offer_items.length > 0 ? `
      <tr>
        <td colspan="6" style="background:#f0fdf4;font-weight:bold;color:#15803d;padding:6px 8px">
          FREE OFFER ITEMS
        </td>
      </tr>
      ${offerRows}` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; margin: 20px; color: #111; }
    h1 { font-size: 20px; margin: 0; }
    h2 { font-size: 14px; color: #444; margin: 4px 0 0; font-weight: normal; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 12px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; font-size: 12px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .totals-table td { border: none; padding: 4px 8px; }
    .totals-table tr.highlight td { font-weight: bold; font-size: 14px; border-top: 2px solid #333; }
    .totals-table tr.green td { color: #15803d; }
    .totals-table tr.red td { color: #dc2626; }
    .sig { display: flex; justify-content: space-between; margin-top: 40px; }
    .sig-box { width: 40%; border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 12px; color: #555; }
    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PUSTI HAPPY TIMES</h1>
    <h2>Delivery Memo</h2>
  </div>

  <div class="meta">
    <div>
      <strong>Outlet:</strong> ${outletName}<br/>
      <strong>Order #:</strong> ${orderNumber}
    </div>
    <div style="text-align:right">
      <strong>Date:</strong> ${dateStr}<br/>
      <strong>Time:</strong> ${timeStr}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center">SKU</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Discount</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${offerSection}
    </tbody>
  </table>

  <table class="totals-table" style="max-width:320px;margin-left:auto">
    <tr>
      <td>Delivery Total</td>
      <td style="text-align:right">৳${result.delivery_total.toFixed(2)}</td>
    </tr>
    ${result.extra_delivery_discount > 0 ? `
    <tr>
      <td>Extra Discount</td>
      <td style="text-align:right">- ৳${result.extra_delivery_discount.toFixed(2)}</td>
    </tr>` : ''}
    ${result.credit_balance_before > 0 ? `
    <tr class="red">
      <td>Previous Credit</td>
      <td style="text-align:right">+ ৳${result.credit_balance_before.toFixed(2)}</td>
    </tr>` : ''}
    <tr class="highlight">
      <td>Total Payable</td>
      <td style="text-align:right">৳${(result.payable + result.credit_balance_before).toFixed(2)}</td>
    </tr>
    <tr class="green">
      <td>Cash Collected</td>
      <td style="text-align:right">৳${result.cash_collected.toFixed(2)}</td>
    </tr>
    <tr ${result.credit_balance_after > 0 ? 'class="red"' : 'class="green"'}>
      <td>Credit Balance</td>
      <td style="text-align:right">৳${result.credit_balance_after.toFixed(2)}</td>
    </tr>
  </table>

  <div class="sig">
    <div class="sig-box">DSR Signature</div>
    <div class="sig-box">Outlet Representative</div>
  </div>

  <div class="footer">This is an auto-generated delivery memo — Pusti Happy Times</div>
</body>
</html>`;
}

// ── Plain text builder ─────────────────────────────────────────────────────────

function buildPlainText(outletName: string, orderNumber: string, confirmedAt: string, result: MemoResult): string {
    const date = new Date(confirmedAt).toLocaleString('en-GB');
    const line = '─'.repeat(40);
    let text = `PUSTI HAPPY TIMES — Delivery Memo\n${line}\n`;
    text += `Outlet: ${outletName}\nOrder #: ${orderNumber}\nDate: ${date}\n${line}\n`;

    text += 'ORDER ITEMS\n';
    result.delivery_items
        .filter(i => i.delivered_qty > 0)
        .forEach(i => {
            const lineTotal = i.delivered_qty * i.unit_price - i.extra_discount;
            text += `  ${i.english_name} (${i.sku})  ×${i.delivered_qty} @ ৳${i.unit_price.toFixed(2)} = ৳${lineTotal.toFixed(2)}\n`;
        });

    if (result.offer_items.length > 0) {
        text += `${line}\nFREE OFFER ITEMS\n`;
        result.offer_items.forEach(o => {
            text += `  ${o.english_name}  ×${o.quantity}  [${o.offer_name}] FREE\n`;
        });
    }

    text += `${line}\n`;
    text += `Delivery Total:  ৳${result.delivery_total.toFixed(2)}\n`;
    if (result.extra_delivery_discount > 0) {
        text += `Extra Discount:  -৳${result.extra_delivery_discount.toFixed(2)}\n`;
    }
    if (result.credit_balance_before > 0) {
        text += `Previous Credit: +৳${result.credit_balance_before.toFixed(2)}\n`;
    }
    text += `Total Payable:   ৳${(result.payable + result.credit_balance_before).toFixed(2)}\n`;
    text += `Cash Collected:  ৳${result.cash_collected.toFixed(2)}\n`;
    text += `Credit Balance:  ৳${result.credit_balance_after.toFixed(2)}\n`;
    return text;
}

// ── Screen ─────────────────────────────────────────────────────────────────────

const DsrMemoScreen: React.FC<Props> = ({ route, navigation }) => {
    const { outletName, orderNumber, confirmedAt, result } = route.params as {
        outletName: string;
        orderNumber: string;
        confirmedAt: string;
        result: MemoResult;
    };

    const [printing, setPrinting] = useState(false);

    const date = new Date(confirmedAt);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const totalPayable = result.payable + result.credit_balance_before;

    const handlePrint = async () => {
        setPrinting(true);
        try {
            const html = buildHtml(outletName, orderNumber, confirmedAt, result);
            const pdf = await generatePDF({
                html,
                fileName: `delivery-memo-${orderNumber}`,
                directory: 'Documents',
            });
            if (pdf.filePath) {
                await Share.share({
                    title: `Delivery Memo — ${outletName}`,
                    url: `file://${pdf.filePath}`,
                    message: `Delivery Memo for ${outletName} — ${dateStr}`,
                });
            }
        } catch (err: any) {
            Alert.alert('Print Error', err.message || 'Failed to generate PDF');
        } finally {
            setPrinting(false);
        }
    };

    const handleShare = async () => {
        try {
            const text = buildPlainText(outletName, orderNumber, confirmedAt, result);
            await Share.share({ message: text });
        } catch (err: any) {
            Alert.alert('Share Error', err.message || 'Failed to share');
        }
    };

    const handleDone = () => {
        navigation.popToTop();
    };

    const deliveredItems = result.delivery_items.filter(i => i.delivered_qty > 0);

    return (
        <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.headerBar}>
                <View>
                    <Text style={styles.headerTitle}>Delivery Memo</Text>
                    <Text style={styles.headerSub}>{outletName}</Text>
                </View>
                <View style={styles.headerMeta}>
                    <Text style={styles.metaText}>{dateStr}</Text>
                    <Text style={styles.metaText}>{timeStr}</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Company banner */}
                <View style={styles.companyBanner}>
                    <Text style={styles.companyName}>PUSTI HAPPY TIMES</Text>
                    <Text style={styles.orderNum}>Order # {orderNumber}</Text>
                </View>

                {/* ORDER ITEMS */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
                        <Text style={styles.sectionCount}>{deliveredItems.length} products</Text>
                    </View>
                    {/* Column headers */}
                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                        <Text style={[styles.colProduct, styles.colHeader]}>Product</Text>
                        <Text style={[styles.colQty, styles.colHeader]}>Qty</Text>
                        <Text style={[styles.colPrice, styles.colHeader]}>Price</Text>
                        <Text style={[styles.colAmount, styles.colHeader]}>Amount</Text>
                    </View>
                    {deliveredItems.map((item, idx) => {
                        const lineTotal = item.delivered_qty * item.unit_price - item.extra_discount;
                        return (
                            <View key={`item-${idx}`} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                                <View style={styles.colProduct}>
                                    <Text style={styles.itemName} numberOfLines={2}>{item.english_name}</Text>
                                    <Text style={styles.itemSku}>{item.sku}</Text>
                                    {item.extra_discount > 0 && (
                                        <Text style={styles.itemDiscount}>disc ৳{item.extra_discount.toFixed(2)}</Text>
                                    )}
                                </View>
                                <Text style={[styles.colQty, styles.cellText]}>×{item.delivered_qty}</Text>
                                <Text style={[styles.colPrice, styles.cellText]}>৳{item.unit_price.toFixed(2)}</Text>
                                <Text style={[styles.colAmount, styles.cellText]}>৳{lineTotal.toFixed(2)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* FREE OFFER ITEMS */}
                {result.offer_items.length > 0 && (
                    <View style={styles.section}>
                        <View style={[styles.sectionHeader, styles.sectionHeaderGreen]}>
                            <Text style={[styles.sectionTitle, styles.sectionTitleGreen]}>FREE OFFER ITEMS</Text>
                            <Text style={[styles.sectionCount, styles.sectionCountGreen]}>{result.offer_items.length} items</Text>
                        </View>
                        {result.offer_items.map((oi, idx) => (
                            <View key={`oi-${idx}`} style={[styles.tableRow, styles.offerRow]}>
                                <View style={styles.colProduct}>
                                    <Text style={styles.itemName}>{oi.english_name}</Text>
                                    <Text style={styles.offerLabel}>{oi.offer_name}</Text>
                                </View>
                                <Text style={[styles.colQty, styles.cellText]}>×{oi.quantity}</Text>
                                <Text style={[styles.colPrice, styles.cellText]} />
                                <Text style={[styles.colAmount, styles.freeTag]}>FREE</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Financial Summary */}
                <View style={styles.financialCard}>
                    <Text style={styles.financialTitle}>FINANCIAL SUMMARY</Text>

                    <View style={styles.financialRow}>
                        <Text style={styles.financialLabel}>Delivery Total</Text>
                        <Text style={styles.financialValue}>৳{result.delivery_total.toFixed(2)}</Text>
                    </View>
                    {result.extra_delivery_discount > 0 && (
                        <View style={styles.financialRow}>
                            <Text style={styles.financialLabel}>Extra Discount</Text>
                            <Text style={[styles.financialValue, styles.deductValue]}>- ৳{result.extra_delivery_discount.toFixed(2)}</Text>
                        </View>
                    )}
                    {result.credit_balance_before > 0 && (
                        <View style={styles.financialRow}>
                            <Text style={styles.financialLabel}>Previous Credit</Text>
                            <Text style={[styles.financialValue, styles.deductValue]}>+ ৳{result.credit_balance_before.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={[styles.financialRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total Payable</Text>
                        <Text style={styles.totalValue}>৳{totalPayable.toFixed(2)}</Text>
                    </View>
                    <View style={styles.financialRow}>
                        <Text style={styles.financialLabel}>Cash Collected</Text>
                        <Text style={[styles.financialValue, styles.cashValue]}>৳{result.cash_collected.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.financialRow, styles.creditRow]}>
                        <Text style={styles.creditLabel}>Credit Balance</Text>
                        <Text style={[styles.creditValue, result.credit_balance_after > 0 ? styles.creditDebt : styles.creditClear]}>
                            ৳{result.credit_balance_after.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Signature block */}
                <View style={styles.signatureBlock}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>DSR Signature</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Outlet Representative</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actionBar}>
                <TouchableOpacity style={[styles.actionBtn, styles.printBtn]} onPress={handlePrint} disabled={printing}>
                    {printing
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
                    }
                    <Text style={styles.actionBtnText}>{printing ? 'Generating…' : 'Print PDF'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
                    <MaterialIcons name="share" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.doneBtn]} onPress={handleDone}>
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Done</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f4f6f9' },
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    headerSub: { color: '#93c5fd', fontSize: 13, marginTop: 2 },
    headerMeta: { alignItems: 'flex-end' },
    metaText: { color: '#bfdbfe', fontSize: 12 },

    scroll: { flex: 1 },
    scrollContent: { padding: 14, paddingBottom: 24 },

    companyBanner: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    companyName: { fontSize: 16, fontWeight: '800', color: '#1e3a5f', letterSpacing: 1 },
    orderNum: { fontSize: 12, color: '#64748b', marginTop: 2 },

    section: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    sectionHeaderGreen: { backgroundColor: '#15803d' },
    sectionTitle: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
    sectionTitleGreen: { color: '#fff' },
    sectionCount: { color: '#93c5fd', fontSize: 11 },
    sectionCountGreen: { color: '#bbf7d0' },

    tableHeaderRow: { backgroundColor: '#f1f5f9' },
    colHeader: { color: '#475569', fontWeight: '600', fontSize: 11 },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableRowAlt: { backgroundColor: '#fafafa' },
    offerRow: { backgroundColor: '#f0fdf4' },

    colProduct: { flex: 3 },
    colQty: { flex: 1, textAlign: 'center' },
    colPrice: { flex: 1.5, textAlign: 'right' },
    colAmount: { flex: 1.5, textAlign: 'right' },

    cellText: { fontSize: 13, color: '#1e293b' },
    itemName: { fontSize: 13, color: '#1e293b', fontWeight: '500' },
    itemSku: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
    itemDiscount: { fontSize: 11, color: '#dc2626', marginTop: 1 },
    offerLabel: { fontSize: 11, color: '#15803d', marginTop: 1 },
    freeTag: { flex: 1.5, textAlign: 'right', color: '#15803d', fontWeight: '700', fontSize: 13 },

    financialCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    financialTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1e3a5f',
        letterSpacing: 0.5,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 6,
    },
    financialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    financialLabel: { fontSize: 14, color: '#64748b' },
    financialValue: { fontSize: 14, color: '#1e293b' },
    deductValue: { color: '#dc2626' },
    cashValue: { color: '#15803d', fontWeight: '600' },
    totalRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4, marginBottom: 8 },
    totalLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    totalValue: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    creditRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 },
    creditLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    creditValue: { fontSize: 15, fontWeight: '700' },
    creditDebt: { color: '#dc2626' },
    creditClear: { color: '#15803d' },

    signatureBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 8,
    },
    signatureBox: { width: '44%', alignItems: 'center' },
    signatureLine: { width: '100%', height: 1, backgroundColor: '#94a3b8', marginBottom: 6 },
    signatureLabel: { fontSize: 11, color: '#64748b' },

    actionBar: {
        flexDirection: 'row',
        gap: 8,
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 8,
    },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    printBtn: { backgroundColor: '#1e3a5f' },
    shareBtn: { backgroundColor: '#0369a1' },
    doneBtn: { backgroundColor: '#15803d' },
});

export default DsrMemoScreen;
