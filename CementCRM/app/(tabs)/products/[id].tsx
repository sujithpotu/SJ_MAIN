import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { uploadProductImage } from '../../../lib/productImages';
import { goBackOr } from '../../../lib/navigation';
import { Product } from '../../../types/database';
import { ProductForm, ProductFormValues } from '../../../components/ProductForm';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) setError(error.message);
    setProduct((data as Product) ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSubmit = async (values: ProductFormValues) => {
    const update: Record<string, unknown> = {
      name: values.name,
      price: values.price ? Number(values.price) : 0,
    };
    if (values.localImageUri) {
      try {
        update.image_path = await uploadProductImage(values.localImageUri, id);
      } catch (e: any) {
        return `Image upload failed: ${e.message ?? e}`;
      }
    }
    const { error } = await supabase.from('products').update(update).eq('id', id);
    if (error) return error.message;
    goBackOr(router, '/products');
    return null;
  };

  const handleDelete = () => {
    Alert.alert('Delete product', 'Leads referencing this product will keep their data, but it will no longer be selectable.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) {
            Alert.alert('Could not delete', error.message);
          } else {
            goBackOr(router, '/products');
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

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Product not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ProductForm initial={product} submitLabel="Save changes" onSubmit={handleSubmit} />
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Delete product</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', fontSize: 15 },
  deleteButton: { alignItems: 'center', paddingVertical: 16 },
  deleteText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
});
