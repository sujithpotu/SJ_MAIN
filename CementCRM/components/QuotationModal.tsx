import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Print from 'expo-print';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { lineNeedsApproval } from '../lib/pricing';
import { buildQuotationHtml } from '../lib/quotationHtml';
import { Product, QuotationStatus, QUOTATION_STATUS_LABELS } from '../types/database';
import { ProductPickerModal } from './ProductPickerModal';

interface DraftLine {
  key: string;
  product: Product | null;
  quantity: string;
  unitPrice: string;
}

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
  leadId: string;
  quotationId?: string;
  account: Account;
  expectedOrderDate: string | null;
  onSaved: () => void;
}

function newLine(): DraftLine {
  return { key: Math.random().toString(36).slice(2), product: null, quantity: '', unitPrice: '' };
}

export function QuotationModal({
  visible,
  onClose,
  leadId,
  quotationId,
  account,
  expectedOrderDate,
  onSaved,
}: Props) {
  const { profile, session } = useAuth();
  const isManager = profile?.role === 'manager';

  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existing, setExisting] = useState<ExistingQuotation | null>(null);
  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (quotationId) {
      setLoadingExisting(true);
      Promise.all([
        supabase.from('quotations').select('id, status, notes').eq('id', quotationId).single(),
        supabase
          .from('quotation_items')
          .select('id, quantity, unit_price, product:products(name, price)')
          .eq('quotation_id', quotationId),
      ]).then(([q, items]) => {
        setExisting((q.data as any) ?? null);
        setExistingItems((items.data as any) ?? []);
        setLoadingExisting(false);
      });
    } else {
      setLines([newLine()]);
    }
  }, [visible, quotationId]);

  const handleAddLine = () => setLines((prev) => [...prev, newLine()]);
  const handleRemoveLine = (key: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const handleCreate = async () => {
    const validLines = lines.filter((l) => l.product && l.quantity && l.unitPrice);
    if (validLines.length === 0) {
      setError('Add at least one product line with quantity and price.');
      return;
    }
    for (const l of validLines) {
      if (Number.isNaN(Number(l.quantity)) || Number.isNaN(Number(l.unitPrice))) {
        setError('Quantity and unit price must be numbers.');
        return;
      }
    }
    setError(null);
    setSubmitting(true);

    const needsApproval = validLines.some((l) =>
      lineNeedsApproval(Number(l.product!.price), Number(l.unitPrice))
    );

    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert({
        lead_id: leadId,
        status: needsApproval ? 'pending_approval' : 'draft',
        created_by: session?.user.id,
      })
      .select('id')
      .single();

    if (qError || !quotation) {
      setError(qError?.message ?? 'Could not create quotation.');
      setSubmitting(false);
      return;
    }

    const { error: itemsError } = await supabase.from('quotation_items').insert(
      validLines.map((l) => ({
        quotation_id: quotation.id,
        product_id: l.product!.id,
        quantity: Number(l.quantity),
        unit_price: Number(l.unitPrice),
      }))
    );

    setSubmitting(false);
    if (itemsError) {
      setError(itemsError.message);
      return;
    }
    onSaved();
    onClose();
  };

  const handleApprove = async (status: 'approved' | 'rejected') => {
    if (!quotationId) return;
    const { error } = await supabase.from('quotations').update({ status }).eq('id', quotationId);
    if (error) {
      Alert.alert('Could not update', error.message);
      return;
    }
    onSaved();
    onClose();
  };

  const handlePrint = async () => {
    if (!quotationId) return;
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
      if (existing && existing.status === 'draft') {
        await supabase.from('quotations').update({ status: 'sent' }).eq('id', quotationId);
        onSaved();
      } else if (existing && existing.status === 'approved') {
        await supabase.from('quotations').update({ status: 'sent' }).eq('id', quotationId);
        onSaved();
      }
    } catch (e: any) {
      Alert.alert('Could not print', e.message ?? String(e));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{quotationId ? 'Quotation' : 'New quotation'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>

        {quotationId ? (
          loadingExisting ? (
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
                    {item.quantity} × ₹{Number(item.unit_price).toFixed(2)} = ₹
                    {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                  </Text>
                </View>
              ))}
              <Text style={styles.grandTotal}>
                Total: ₹
                {existingItems
                  .reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)
                  .toFixed(2)}
              </Text>

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
                  This quotation has a discounted price and needs manager approval before it can
                  be sent.
                </Text>
              )}

              {(existing.status === 'draft' || existing.status === 'approved' || existing.status === 'sent') && (
                <TouchableOpacity style={[styles.button, styles.printButton]} onPress={handlePrint}>
                  <Text style={styles.buttonText}>
                    {existing.status === 'sent' ? 'Print again' : 'Print & mark as sent'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.error}>Quotation not found.</Text>
          )
        ) : (
          <>
            {lines.map((line) => (
              <View key={line.key} style={styles.lineCard}>
                <TouchableOpacity
                  style={styles.lineProductPicker}
                  onPress={() => setActiveLineKey(line.key)}
                >
                  <Text style={styles.lineProductText}>
                    {line.product?.name ?? 'Select a product'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.lineInputsRow}>
                  <TextInput
                    style={[styles.input, styles.lineInput]}
                    placeholder="Qty"
                    keyboardType="numeric"
                    value={line.quantity}
                    onChangeText={(v) => updateLine(line.key, { quantity: v })}
                  />
                  <TextInput
                    style={[styles.input, styles.lineInput]}
                    placeholder="Unit price"
                    keyboardType="numeric"
                    value={line.unitPrice}
                    onChangeText={(v) => updateLine(line.key, { unitPrice: v })}
                  />
                  {lines.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveLine(line.key)} hitSlop={8}>
                      <Text style={styles.removeLine}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addLine} onPress={handleAddLine}>
              <Text style={styles.addLineText}>+ Add another product</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, styles.createButton, submitting && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>{submitting ? 'Saving…' : 'Create quotation'}</Text>
            </TouchableOpacity>

            <ProductPickerModal
              visible={!!activeLineKey}
              onClose={() => setActiveLineKey(null)}
              onSelect={(product) => {
                if (activeLineKey) {
                  updateLine(activeLineKey, {
                    product,
                    unitPrice: lines.find((l) => l.key === activeLineKey)?.unitPrice || String(product.price),
                  });
                }
                setActiveLineKey(null);
              }}
            />
          </>
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
  lineCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  lineProductPicker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  lineProductText: { fontSize: 14, color: '#0f172a' },
  lineInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineInput: { flex: 1, marginBottom: 0 },
  removeLine: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  addLine: { paddingVertical: 10, marginBottom: 20 },
  addLineText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  error: { color: '#dc2626', marginBottom: 12, fontSize: 14 },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 40,
  },
  createButton: { backgroundColor: '#2563eb' },
  printButton: { backgroundColor: '#0f172a' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  approvalRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  approveButton: { backgroundColor: '#16a34a', flex: 1, marginBottom: 0 },
  rejectButton: { backgroundColor: '#dc2626', flex: 1, marginBottom: 0 },
});
