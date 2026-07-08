import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Print from 'expo-print';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/format';
import { buildQuotationHtml } from '../lib/quotationHtml';
import { QuotationStatus, QUOTATION_STATUS_LABELS } from '../types/database';

interface ExistingItem {
  id: string;
  quantity: number;
  unit_price: number;
  product: { name: string; price: number } | null;
}

interface ExistingQuotation {
  id: string;
  status: QuotationStatus;
  notes: string | null;
}

interface Account {
  name: string;
  location: string | null;
  contact_person: string | null;
  phone: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  quotationId: string;
  account: Account;
  expectedOrderDate: string | null;
  onSaved: () => void;
}

export function QuotationModal({
  visible,
  onClose,
  quotationId,
  account,
  expectedOrderDate,
  onSaved,
}: Props) {
  const { profile } = useAuth();
  const isManager = profile?.role === 'manager';

  const [existing, setExisting] = useState<ExistingQuotation | null>(null);
  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([
      supabase.from('quotations').select('id, status, notes').eq('id', quotationId).single(),
      supabase
        .from('quotation_items')
        .select('id, quantity, unit_price, product:products(name, price)')
        .eq('quotation_id', quotationId),
    ]).then(([q, items]) => {
      setExisting((q.data as any) ?? null);
      setExistingItems((items.data as any) ?? []);
      setLoading(false);
    });
  }, [visible, quotationId]);

  const handleApprove = async (status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('quotations').update({ status }).eq('id', quotationId);
    if (error) {
      Alert.alert('Could not update', error.message);
      return;
    }
    onSaved();
    onClose();
  };

  const handlePrint = async () => {
    try {
      const html = buildQuotationHtml({
        accountName: account.name,
        accountLocation: account.location,
        accountContact: account.contact_person,
        accountPhone: account.phone,
        expectedOrderDate,
        items: existingItems.map((item) => ({
          productName: item.product?.name ?? 'Unknown product',
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
        })),
      });
      await Print.printAsync({ html });
      if (existing && existing.status !== 'sent') {
        await supabase.from('quotations').update({ status: 'sent' }).eq('id', quotationId);
        onSaved();
      }
    } catch (e: any) {
      Alert.alert('Could not print', e.message ?? String(e));
    }
  };

  const total = existingItems.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
    0
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Quotation</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : existing ? (
          <>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{QUOTATION_STATUS_LABELS[existing.status]}</Text>
            </View>

            {existingItems.map((item) => (
              <View key={item.id} style={styles.lineRow}>
                <Text style={styles.lineName}>{item.product?.name ?? 'Unknown product'}</Text>
                <Text style={styles.lineMeta}>
                  {item.quantity} × {formatCurrency(Number(item.unit_price))} ={' '}
                  {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                </Text>
              </View>
            ))}
            <Text style={styles.grandTotal}>Total: {formatCurrency(total)}</Text>

            {existing.status === 'pending_approval' && isManager && (
              <View style={styles.approvalRow}>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => handleApprove('rejected')}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={() => handleApprove('approved')}
                >
                  <Text style={styles.buttonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}

            {existing.status === 'pending_approval' && !isManager && (
              <Text style={styles.muted}>
                This quotation has a discounted price and needs manager approval before it can be
                sent.
              </Text>
            )}

            {existing.status !== 'pending_approval' && existing.status !== 'rejected' && (
              <TouchableOpacity style={[styles.button, styles.printButton]} onPress={handlePrint}>
                <Text style={styles.buttonText}>
                  {existing.status === 'sent' ? 'Print again' : 'Print & mark as sent'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.error}>Quotation not found.</Text>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  close: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  muted: { color: '#64748b', fontSize: 14, marginBottom: 16 },
  error: { color: '#dc2626', fontSize: 15 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  statusText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  lineRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  lineName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  lineMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  grandTotal: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 16, marginBottom: 20 },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 40,
  },
  printButton: { backgroundColor: '#0f172a' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  approvalRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  approveButton: { backgroundColor: '#16a34a', flex: 1, marginBottom: 0 },
  rejectButton: { backgroundColor: '#dc2626', flex: 1, marginBottom: 0 },
});
