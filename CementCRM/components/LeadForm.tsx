import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Lead, LeadStage, LEAD_STAGES } from '../types/database';
import { OptionChips } from './OptionChips';
import { PickerModal, PickerItem } from './PickerModal';

export interface LeadFormValues {
  account_id: string;
  stage: LeadStage;
  product_type: string;
  quantity: string;
  expected_order_date: string;
}

interface Props {
  initial?: Lead;
  initialAccountName?: string;
  submitLabel: string;
  onSubmit: (values: LeadFormValues) => Promise<string | null>;
  footer?: React.ReactNode;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function LeadForm({ initial, initialAccountName, submitLabel, onSubmit, footer }: Props) {
  const [accountId, setAccountId] = useState(initial?.account_id ?? '');
  const [accountName, setAccountName] = useState(initialAccountName ?? '');
  const [accounts, setAccounts] = useState<PickerItem[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [stage, setStage] = useState<LeadStage>(initial?.stage ?? 'New Lead');
  const [productType, setProductType] = useState(initial?.product_type ?? '');
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : '');
  const [expectedDate, setExpectedDate] = useState(initial?.expected_order_date ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('accounts')
      .select('id, name, type')
      .order('name')
      .then(({ data }) => {
        setAccounts((data ?? []).map((a) => ({ id: a.id, title: a.name, subtitle: a.type })));
      });
  }, []);

  const handleSubmit = async () => {
    if (!accountId) {
      setError('Select an account for this lead.');
      return;
    }
    if (expectedDate && !DATE_RE.test(expectedDate)) {
      setError('Expected order date must be in YYYY-MM-DD format.');
      return;
    }
    if (quantity && Number.isNaN(Number(quantity))) {
      setError('Quantity must be a number.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await onSubmit({
      account_id: accountId,
      stage,
      product_type: productType.trim(),
      quantity,
      expected_order_date: expectedDate.trim(),
    });
    setSubmitting(false);
    if (result) setError(result);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Account</Text>
      <TouchableOpacity style={styles.picker} onPress={() => setPickerVisible(true)}>
        <Text style={styles.pickerText}>{accountName || 'Select an account'}</Text>
      </TouchableOpacity>

      <OptionChips label="Pipeline stage" options={LEAD_STAGES.map((s) => ({ value: s, label: s }))} value={stage} onChange={setStage} />

      <Text style={styles.label}>Product type</Text>
      <TextInput
        style={styles.input}
        value={productType}
        onChangeText={setProductType}
        placeholder="e.g. OPC 53 Grade, RMC M25"
      />

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        placeholder="e.g. 500"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Expected order date</Text>
      <TextInput
        style={styles.input}
        value={expectedDate}
        onChangeText={setExpectedDate}
        placeholder="YYYY-MM-DD"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? 'Saving…' : submitLabel}</Text>
      </TouchableOpacity>

      {footer}

      <PickerModal
        visible={pickerVisible}
        title="Select account"
        items={accounts}
        onClose={() => setPickerVisible(false)}
        onSelect={(item) => {
          setAccountId(item.id);
          setAccountName(item.title);
          setPickerVisible(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    color: '#0f172a',
  },
  picker: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  pickerText: { fontSize: 15, color: '#0f172a' },
  error: { color: '#dc2626', marginBottom: 12, fontSize: 14 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
