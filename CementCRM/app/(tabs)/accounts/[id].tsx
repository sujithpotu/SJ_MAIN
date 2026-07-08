import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Account } from '../../../types/database';
import { AccountForm, AccountFormValues } from '../../../components/AccountForm';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single();
    if (error) setError(error.message);
    setAccount((data as Account) ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSubmit = async (values: AccountFormValues) => {
    const { error } = await supabase.from('accounts').update(values).eq('id', id);
    if (error) return error.message;
    router.back();
    return null;
  };

  const [converting, setConverting] = useState(false);

  const handleConvertToLead = async () => {
    setConverting(true);
    const { error: statusError } = await supabase
      .from('accounts')
      .update({ status: 'active' })
      .eq('id', id);
    if (statusError) {
      Alert.alert('Could not convert', statusError.message);
      setConverting(false);
      return;
    }
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({ account_id: id, stage: 'New Lead' })
      .select('id')
      .single();
    setConverting(false);
    if (leadError || !newLead) {
      Alert.alert('Could not create lead', leadError?.message ?? 'Unknown error');
      return;
    }
    router.replace(`/leads/${newLead.id}`);
  };

  const handleDelete = () => {
    Alert.alert('Delete account', 'This will also delete its leads. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('accounts').delete().eq('id', id);
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

  if (error || !account) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Account not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {account.status === 'prospect' && (
        <View style={styles.prospectBanner}>
          <Text style={styles.prospectBannerText}>
            This is a prospect — not yet an active account.
          </Text>
          <TouchableOpacity
            style={[styles.convertButton, converting && styles.convertButtonDisabled]}
            onPress={handleConvertToLead}
            disabled={converting}
          >
            <Text style={styles.convertButtonText}>
              {converting ? 'Converting…' : 'Convert to lead'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <AccountForm initial={account} submitLabel="Save changes" onSubmit={handleSubmit} />
      {profile?.role === 'manager' && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete account</Text>
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
  prospectBanner: {
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  prospectBannerText: { fontSize: 13, color: '#92400e', marginBottom: 8 },
  convertButton: {
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  convertButtonDisabled: { opacity: 0.6 },
  convertButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
