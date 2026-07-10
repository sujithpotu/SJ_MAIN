import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { goBackOr } from '../../../lib/navigation';
import { Lead } from '../../../types/database';
import { LeadForm, LeadFormValues } from '../../../components/LeadForm';
import { LeadItemsEditor } from '../../../components/LeadItemsEditor';
import { LeadTimeline } from '../../../components/LeadTimeline';
import { QuotationsSection } from '../../../components/QuotationsSection';

interface LeadWithJoins extends Lead {
  account: {
    name: string;
    location: string | null;
    contact_person: string | null;
    phone: string | null;
  } | null;
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, session } = useAuth();
  const [lead, setLead] = useState<LeadWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*, account:accounts(name, location, contact_person, phone)')
      .eq('id', id)
      .single();
    if (error) setError(error.message);
    setLead((data as any) ?? null);
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
        expected_order_date: values.expected_order_date || null,
      })
      .eq('id', id);
    if (error) return error.message;

    if (lead && values.stage !== lead.stage && session) {
      await supabase.from('lead_stage_history').insert({
        lead_id: id,
        stage: values.stage,
        comment: values.stageComment || null,
        changed_by: session.user.id,
      });
    }

    goBackOr(router, '/leads');
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
            goBackOr(router, '/leads');
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

  const locked = lead.stage === 'Won' || lead.stage === 'Lost';

  return (
    <View style={{ flex: 1 }}>
      <LeadForm
        initial={lead}
        initialAccountName={lead.account?.name}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        footer={
          <>
            <LeadItemsEditor leadId={lead.id} locked={locked} />
            <QuotationsSection
              leadId={lead.id}
              account={{
                id: lead.account_id,
                name: lead.account?.name ?? 'Unknown account',
                location: lead.account?.location ?? null,
                contact_person: lead.account?.contact_person ?? null,
                phone: lead.account?.phone ?? null,
              }}
              expectedOrderDate={lead.expected_order_date}
              locked={locked}
            />
            <LeadTimeline leadId={lead.id} />
          </>
        }
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
