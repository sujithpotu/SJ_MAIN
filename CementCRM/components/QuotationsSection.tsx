import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { QuotationStatus, QUOTATION_STATUS_LABELS } from '../types/database';
import { QuotationModal } from './QuotationModal';

interface QuotationRow {
  id: string;
  status: QuotationStatus;
  created_at: string;
}

const STATUS_COLORS: Record<QuotationStatus, string> = {
  draft: '#64748b',
  pending_approval: '#d97706',
  approved: '#16a34a',
  rejected: '#dc2626',
  sent: '#2563eb',
};

interface Account {
  name: string;
  location: string | null;
  contact_person: string | null;
  phone: string | null;
}

interface Props {
  leadId: string;
  account: Account;
  expectedOrderDate: string | null;
}

export function QuotationsSection({ leadId, account, expectedOrderDate }: Props) {
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeQuotationId, setActiveQuotationId] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('quotations')
      .select('id, status, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setQuotations((data as QuotationRow[]) ?? []);
  }, [leadId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Quotations</Text>
        <TouchableOpacity
          onPress={() => {
            setActiveQuotationId(undefined);
            setModalVisible(true);
          }}
        >
          <Text style={styles.newButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      {quotations.length === 0 && <Text style={styles.empty}>No quotations yet.</Text>}

      {quotations.map((q) => (
        <TouchableOpacity
          key={q.id}
          style={styles.row}
          onPress={() => {
            setActiveQuotationId(q.id);
            setModalVisible(true);
          }}
        >
          <Text style={styles.rowDate}>{new Date(q.created_at).toLocaleDateString()}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[q.status] }]}>
            <Text style={styles.badgeText}>{QUOTATION_STATUS_LABELS[q.status]}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <QuotationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        leadId={leadId}
        quotationId={activeQuotationId}
        account={account}
        expectedOrderDate={expectedOrderDate}
        onSaved={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heading: { fontSize: 13, fontWeight: '600', color: '#475569' },
  newButton: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  empty: { fontSize: 13, color: '#94a3b8' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowDate: { fontSize: 14, color: '#0f172a' },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
});
