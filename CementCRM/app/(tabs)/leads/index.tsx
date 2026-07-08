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
import { formatCurrency, formatDate } from '../../../lib/format';
import { LEAD_STAGES, LeadStage } from '../../../types/database';

interface LeadItemRow {
  quantity: number;
  unit_price: number;
  product: { name: string } | null;
}

interface LeadRow {
  id: string;
  account_id: string;
  stage: LeadStage;
  expected_order_date: string | null;
  account: { name: string } | null;
  lead_items: LeadItemRow[];
}

const STAGE_COLORS: Record<LeadStage, string> = {
  'New Lead': '#64748b',
  'Site Visit': '#0891b2',
  'Quotation Sent': '#7c3aed',
  Negotiation: '#d97706',
  Won: '#16a34a',
  Lost: '#dc2626',
};

export default function LeadsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<LeadStage | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('leads')
      .select(
        'id, account_id, stage, expected_order_date, account:accounts(name), lead_items(quantity, unit_price, product:products(name))'
      )
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setLeads((data as any) ?? []);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = leads.filter((l) => {
    if (stageFilter !== 'All' && l.stage !== stageFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      l.account?.name?.toLowerCase().includes(q) ||
      l.lead_items.some((i) => i.product?.name?.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.banner}>
        {profile?.role === 'manager'
          ? 'Manager view — showing all leads'
          : 'Showing leads for your accounts'}
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Search by account or product…"
        value={query}
        onChangeText={setQuery}
      />

      <View style={styles.stageRow}>
        {(['All', ...LEAD_STAGES] as const).map((stage) => (
          <TouchableOpacity
            key={stage}
            style={[styles.stageChip, stageFilter === stage && styles.stageChipSelected]}
            onPress={() => setStageFilter(stage)}
          >
            <Text
              style={[
                styles.stageChipText,
                stageFilter === stage && styles.stageChipTextSelected,
              ]}
            >
              {stage}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={filtered.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No leads yet. Tap + to add one.</Text> : null
        }
        renderItem={({ item }) => {
          const items = item.lead_items;
          const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);
          const productSummary =
            items.length === 0
              ? 'No products set'
              : items.length === 1
                ? items[0].product?.name ?? 'Unknown product'
                : `${items[0].product?.name ?? 'Unknown product'} +${items.length - 1} more`;

          return (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/leads/${item.id}`)}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{item.account?.name ?? 'Unknown account'}</Text>
                <View style={[styles.stageBadge, { backgroundColor: STAGE_COLORS[item.stage] }]}>
                  <Text style={styles.stageBadgeText}>{item.stage}</Text>
                </View>
              </View>
              <Text style={styles.rowSubtitle}>{productSummary}</Text>
              <View style={styles.rowFooter}>
                {item.expected_order_date ? (
                  <Text style={styles.rowMeta}>Expected: {formatDate(item.expected_order_date)}</Text>
                ) : (
                  <Text style={styles.rowMeta} />
                )}
                {total > 0 ? <Text style={styles.rowMeta}>{formatCurrency(total)}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/leads/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  banner: { fontSize: 12, color: '#64748b', paddingHorizontal: 16, paddingTop: 12 },
  search: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  stageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stageChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  stageChipSelected: { backgroundColor: '#0f172a' },
  stageChipText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  stageChipTextSelected: { color: '#fff' },
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
  stageBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  stageBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
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
