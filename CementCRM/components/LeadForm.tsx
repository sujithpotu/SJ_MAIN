import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Lead, LeadStage, LEAD_STAGES } from '../types/database';
import { OptionChips } from './OptionChips';
import { PickerModal, PickerItem } from './PickerModal';
import { DateField } from './DateField';

export interface LeadFormValues {
  account_id: string;
  stage: LeadStage;
  expected_order_date: string;
  stageComment: string;
}

interface Props {
  initial?: Lead;
  initialAccountName?: string;
  submitLabel: string;
  onSubmit: (values: LeadFormValues) => Promise<string | null>;
  footer?: React.ReactNode;
}

export function LeadForm({ initial, initialAccountName, submitLabel, onSubmit, footer }: Props) {
  const [accountId, setAccountId] = useState(initial?.account_id ?? '');
  const [accountName, setAccountName] = useState(initialAccountName ?? '');
  const [accounts, setAccounts] = useState<PickerItem[]>([]);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);

  const initialStage = initial?.stage ?? 'New Lead';
  const [stage, setStage] = useState<LeadStage>(initialStage);
  const [stageComment, setStageComment] = useState('');

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
    setError(null);
    setSubmitting(true);
    const result = await onSubmit({
      account_id: accountId,
      stage,
      expected_order_date: expectedDate.trim(),
      stageComment: stageComment.trim(),
    });
    setSubmitting(false);
    if (result) setError(result);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Account</Text>
      <TouchableOpacity style={styles.picker} onPress={() => setAccountPickerVisible(true)}>
        <Text style={styles.pickerText}>{accountName || 'Select an account'}</Text>
      </TouchableOpacity>

      <OptionChips
        label="Pipeline stage"
        options={LEAD_STAGES.map((s) => ({ value: s, label: s }))}
        value={stage}
        onChange={setStage}
      />

      {initial && stage !== initialStage && (
        <View style={styles.wrapper}>
          <Text style={styles.label}>Comment on this stage change (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={stageComment}
            onChangeText={setStageComment}
            placeholder={`Why is this moving to "${stage}"?`}
            multiline
          />
        </View>
      )}

      <DateField label="Expected order date" value={expectedDate} onChange={setExpectedDate} />

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
        visible={accountPickerVisible}
        title="Select account"
        items={accounts}
        onClose={() => setAccountPickerVisible(false)}
        onSelect={(item) => {
          setAccountId(item.id);
          setAccountName(item.title);
          setAccountPickerVisible(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  wrapper: { marginBottom: 16 },
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
  multiline: { minHeight: 70, textAlignVertical: 'top' },
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
