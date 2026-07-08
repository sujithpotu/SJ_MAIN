import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/format';

interface HistoryRow {
  id: string;
  stage: string;
  changed_at: string;
  comment: string | null;
  changed_by: { full_name: string | null } | null;
}

export function LeadTimeline({ leadId }: { leadId: string }) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('lead_stage_history')
      .select('id, stage, changed_at, comment, changed_by:profiles(full_name)')
      .eq('lead_id', leadId)
      .order('changed_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setHistory((data as any) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (loading || history.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Stage timeline</Text>
      {history.map((entry, index) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.dotColumn}>
            <View style={styles.dot} />
            {index < history.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.stage}>{entry.stage}</Text>
            <Text style={styles.meta}>
              {formatDateTime(entry.changed_at)}
              {entry.changed_by?.full_name ? ` · ${entry.changed_by.full_name}` : ''}
            </Text>
            {entry.comment ? <Text style={styles.comment}>{entry.comment}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  heading: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 12 },
  row: { flexDirection: 'row' },
  dotColumn: { alignItems: 'center', width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb', marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: '#e2e8f0', marginVertical: 2 },
  textColumn: { flex: 1, paddingLeft: 10, paddingBottom: 16 },
  stage: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  comment: { fontSize: 13, color: '#334155', marginTop: 4, fontStyle: 'italic' },
});
