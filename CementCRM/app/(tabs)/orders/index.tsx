import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { formatDate } from '../../../lib/format';
import { SalesOrderStatus, SALES_ORDER_STATUS_LABELS } from '../../../types/database';

interface OrderRow {
  id: string;
  status: SalesOrderStatus;
  delivery_date: string | null;
  created_at: string;
  account: { name: string } | null;
}

const STATUS_COLORS: Record<SalesOrderStatus, string> = {
  confirmed: '#64748b',
  delivery_planned: '#0891b2',
  dispatched: '#7c3aed',
  delivered: '#16a34a',
};

export default function OrdersScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('sales_orders')
      .select('id, status, delivery_date, created_at, account:accounts(name)')
      .order('created_at', { ascending: false });
    setOrders((data as any) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.banner}>
        {profile?.role === 'manager'
          ? 'Manager view — showing all orders'
          : 'Showing orders for your accounts'}
      </Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={[styles.list, orders.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              No orders yet. Convert an approved quotation into one from a lead's page.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/orders/${item.id}`)}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{item.account?.name ?? 'Unknown account'}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                <Text style={styles.badgeText}>{SALES_ORDER_STATUS_LABELS[item.status]}</Text>
              </View>
            </View>
            {item.delivery_date ? (
              <Text style={styles.rowMeta}>Delivery: {formatDate(item.delivery_date)}</Text>
            ) : (
              <Text style={styles.rowMeta}>Delivery date not set</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  banner: { fontSize: 12, color: '#64748b', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  list: { paddingHorizontal: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#94a3b8', paddingHorizontal: 20 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', flexShrink: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  rowMeta: { fontSize: 13, color: '#64748b', marginTop: 4 },
});
