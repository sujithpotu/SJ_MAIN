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
});
