import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Account, AccountType, ACCOUNT_TYPES } from '../types/database';
import { OptionChips } from './OptionChips';
import { PickerModal, PickerItem } from './PickerModal';

export interface AccountFormValues {
  name: string;
  type: AccountType;
  location: string;
  contact_person: string;
  phone: string;
  assigned_rep: string;
}

interface Props {
  initial?: Account;
  submitLabel: string;
  onSubmit: (values: AccountFormValues) => Promise<string | null>;
}

export function AccountForm({ initial, submitLabel, onSubmit }: Props) {
  const { profile } = useAuth();
  const isManager = profile?.role === 'manager';

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'dealer');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [contactPerson, setContactPerson] = useState(initial?.contact_person ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [assignedRep, setAssignedRep] = useState(initial?.assigned_rep ?? profile?.id ?? '');
  const [assignedRepName, setAssignedRepName] = useState<string>('');
  const [reps, setReps] = useState<PickerItem[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isManager) return;
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name')
      .then(({ data }) => {
        setReps(
          (data ?? []).map((p) => ({
            id: p.id,
            title: p.full_name ?? p.id,
            subtitle: p.role,
          }))
        );
      });
  }, [isManager]);

  useEffect(() => {
    if (!assignedRep) return;
    if (assignedRep === profile?.id) {
      setAssignedRepName(profile?.full_name ?? 'You');
      return;
    }
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignedRep)
      .single()
      .then(({ data }) => setAssignedRepName(data?.full_name ?? 'Unknown'));
  }, [assignedRep, profile]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }
    if (!assignedRep) {
      setError('An assigned sales rep is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await onSubmit({
      name: name.trim(),
      type,
      location: location.trim(),
      contact_person: contactPerson.trim(),
      phone: phone.trim(),
      assigned_rep: assignedRep,
    });
    setSubmitting(false);
    if (result) setError(result);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Sharma Cement Dealers" />

      <OptionChips label="Type" options={ACCOUNT_TYPES} value={type} onChange={setType} />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="City / area" />

      <Text style={styles.label}>Contact person</Text>
      <TextInput style={styles.input} value={contactPerson} onChangeText={setContactPerson} placeholder="Full name" />

      <Text style={styles.label}>Phone number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+91…"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Assigned sales rep</Text>
      {isManager ? (
        <TouchableOpacity style={styles.picker} onPress={() => setPickerVisible(true)}>
          <Text style={styles.pickerText}>{assignedRepName || 'Select a rep'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.picker, styles.pickerDisabled]}>
          <Text style={styles.pickerText}>{profile?.full_name ?? 'You'}</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? 'Saving…' : submitLabel}</Text>
      </TouchableOpacity>

      <PickerModal
        visible={pickerVisible}
        title="Select sales rep"
        items={reps}
        onClose={() => setPickerVisible(false)}
        onSelect={(item) => {
          setAssignedRep(item.id);
          setAssignedRepName(item.title);
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
  pickerDisabled: { backgroundColor: '#f1f5f9' },
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
