import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface Props {
  visible: boolean;
  title: string;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
}

export function PickerModal({ visible, title, items, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No results</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                onSelect(item);
                setQuery('');
              }}
            >
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  close: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  search: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowTitle: { fontSize: 16, color: '#0f172a', fontWeight: '500' },
  rowSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
});
