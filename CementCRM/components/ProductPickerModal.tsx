import { useEffect, useState } from 'react';
import { FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { productImageUrl } from '../lib/productImages';
import { formatCurrency } from '../lib/format';
import { Product } from '../types/database';

interface Props {
  visible: boolean;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export function ProductPickerModal({ visible, onSelect, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!visible) return;
    supabase
      .from('products')
      .select('*')
      .order('name')
      .then(({ data }) => setProducts((data as Product[]) ?? []));
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select product</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No products yet. Ask a manager to add some in the Products tab.
            </Text>
          }
          renderItem={({ item }) => {
            const imageUrl = productImageUrl(item.image_path);
            return (
              <TouchableOpacity style={styles.card} onPress={() => onSelect(item)}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Text style={styles.imagePlaceholderText}>No image</Text>
                  </View>
                )}
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.price}>{formatCurrency(Number(item.price))}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  close: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  list: { paddingBottom: 40 },
  row: { justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  image: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#e2e8f0' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: '#94a3b8', fontSize: 12 },
  name: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 8 },
  price: { fontSize: 13, color: '#64748b', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60 },
});
