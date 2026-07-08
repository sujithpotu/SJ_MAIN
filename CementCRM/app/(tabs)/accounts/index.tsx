import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { ACCOUNT_TYPES } from '../../../types/database';

interface AccountRow {
  id: string;
  name: string;
  type: string;
  location: string | null;
  contact_person: string | null;
  phone: string | null;
  assigned_rep: string;
  rep: { full_name: string | null } | null;
}

const typeLabel = (value: string) =>
  ACCOUNT_TYPES.find((t) => t.value === value)?.label ?? value;

export default function AccountsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, type, location, contact_person, phone, assigned_rep, rep:profiles!assigned_rep(full_name)')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setAccounts((data as any) ?? []);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = accounts.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.contact_person?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.banner}>
        {profile?.role === 'manager'
          ? 'Manager view — showing all accounts'
          : 'Showing accounts assigned to you'}
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Search accounts…"
        value={query}
        onChangeText={setQuery}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={filtered.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No accounts yet. Tap + to add one.</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/accounts/${item.id}`)}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{typeLabel(item.type)}</Text>
              </View>
            </View>
            {item.location ? <Text style={styles.rowSubtitle}>{item.location}</Text> : null}
            <View style={styles.rowFooter}>
              <Text style={styles.rowMeta}>
                {item.contact_person ?? 'No contact'} {item.phone ? `· ${item.phone}` : ''}
              </Text>
              {profile?.role === 'manager' && (
                <Text style={styles.rowMeta}>{item.rep?.full_name ?? 'Unassigned'}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/accounts/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  banner: {
    fontSize: 12,
    color: '#64748b',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  search: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: { color: '#dc2626', paddingHorizontal: 16, marginBottom: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#94a3b8' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', flexShrink: 1 },
  typeBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeBadgeText: { fontSize: 11, color: '#2563eb', fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  rowMeta: { fontSize: 12, color: '#94a3b8' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '400' },
});
