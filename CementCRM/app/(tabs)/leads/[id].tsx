import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Lead } from '../../../types/database';
import { LeadForm, LeadFormValues } from '../../../components/LeadForm';

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*, account:accounts(name)')
      .eq('id', id)
      .single();
    if (error) setError(error.message);
    setLead((data as any) ?? null);
    setAccountName((data as any)?.account?.name ?? '');
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSubmit = async (values: LeadFormValues) => {
    const { error } = await supabase
      .from('leads')
      .update({
        account_id: values.account_id,
        stage: values.stage,
        product_type: values.product_type || null,
        quantity: values.quantity ? Number(values.quantity) : null,
        expected_order_date: values.expected_order_date || null,
      })
      .eq('id', id);
    if (error) return error.message;
    router.back();
    return null;
  };

  const handleDelete = () => {
    Alert.alert('Delete lead', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('leads').delete().eq('id', id);
          if (error) {
            Alert.alert('Could not delete', error.message);
          } else {
            router.back();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !lead) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Lead not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LeadForm
        initial={lead}
        initialAccountName={accountName}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
      />
      {profile?.role === 'manager' && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete lead</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', fontSize: 15 },
  deleteButton: { alignItems: 'center', paddingVertical: 16 },
  deleteText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
});
