import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { productImageUrl } from '../../../lib/productImages';
import { useAuth } from '../../../context/AuthContext';
import { Product } from '../../../types/database';

export default function ProductsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const isManager = profile?.role === 'manager';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts((data as Product[]) ?? []);
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
        {isManager ? 'Manage the product catalog' : 'Product catalog (view only)'}
      </Text>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={[styles.list, products.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No products yet.</Text> : null
        }
        renderItem={({ item }) => {
          const imageUrl = productImageUrl(item.image_path);
          return (
            <TouchableOpacity
              style={styles.row}
              disabled={!isManager}
              onPress={() => router.push(`/products/${item.id}`)}
            >
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>₹{item.price}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {isManager && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/products/new')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  banner: { fontSize: 12, color: '#64748b', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  list: { paddingHorizontal: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#94a3b8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e2e8f0' },
  thumbPlaceholder: {},
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  price: { fontSize: 13, color: '#64748b', marginTop: 2 },
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
