import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';
import { lineNeedsApproval } from '../lib/pricing';
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
  const { session } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [generating, setGenerating] = useState(false);
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

  const hasPendingApproval = quotations.some((q) => q.status === 'pending_approval');

  const handleGenerate = async () => {
    if (hasPendingApproval) {
      Alert.alert(
        'Pending approval',
        'This lead already has a quotation pending approval. Wait for a manager to approve or reject it before generating another.'
      );
      return;
    }
    setGenerating(true);

    const { data: leadItems, error: itemsError } = await supabase
      .from('lead_items')
      .select('product_id, quantity, unit_price, product:products(price)')
      .eq('lead_id', leadId);

    if (itemsError) {
      Alert.alert('Could not generate quotation', itemsError.message);
      setGenerating(false);
      return;
    }
    if (!leadItems || leadItems.length === 0) {
      Alert.alert(
        'No products yet',
        'Add at least one product to this lead before generating a quotation.'
      );
      setGenerating(false);
      return;
    }

    const needsApproval = (leadItems as any[]).some((item) =>
      lineNeedsApproval(Number(item.product?.price ?? 0), Number(item.unit_price))
    );

    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert({
        lead_id: leadId,
        status: needsApproval ? 'pending_approval' : 'draft',
        created_by: session?.user.id,
      })
      .select('id')
      .single();

    if (qError || !quotation) {
      Alert.alert('Could not generate quotation', qError?.message ?? 'Unknown error');
      setGenerating(false);
      return;
    }

    const { error: qiError } = await supabase.from('quotation_items').insert(
      (leadItems as any[]).map((item) => ({
        quotation_id: quotation.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    );

    setGenerating(false);
    if (qiError) {
      Alert.alert('Could not generate quotation', qiError.message);
      return;
    }

    await load();
    setActiveQuotationId(quotation.id);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Quotations</Text>
        <TouchableOpacity onPress={handleGenerate} disabled={generating || hasPendingApproval}>
          <Text
            style={[styles.newButton, hasPendingApproval && styles.newButtonDisabled]}
          >
            {generating ? 'Generating…' : '+ Generate'}
          </Text>
        </TouchableOpacity>
      </View>

      {quotations.length === 0 && (
        <Text style={styles.empty}>
          No quotations yet. Add products above, then tap Generate.
        </Text>
      )}

      {hasPendingApproval && (
        <Text style={styles.pendingNotice}>
          A quotation is pending approval — approve or reject it before generating another.
        </Text>
      )}

      {quotations.map((q) => (
        <TouchableOpacity
          key={q.id}
          style={styles.row}
          onPress={() => {
            setActiveQuotationId(q.id);
            setModalVisible(true);
          }}
        >
          <Text style={styles.rowDate}>{formatDate(q.created_at)}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[q.status] }]}>
            <Text style={styles.badgeText}>{QUOTATION_STATUS_LABELS[q.status]}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {activeQuotationId && (
        <QuotationModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          quotationId={activeQuotationId}
          account={account}
          expectedOrderDate={expectedOrderDate}
          onSaved={load}
        />
      )}
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
  newButtonDisabled: { color: '#cbd5e1' },
  empty: { fontSize: 13, color: '#94a3b8' },
  pendingNotice: { fontSize: 12, color: '#d97706', marginBottom: 10 },
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
