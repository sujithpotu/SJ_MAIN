import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { productImageUrl } from '../lib/productImages';
import { formatCurrency } from '../lib/format';
import { Product } from '../types/database';
import { ProductPickerModal } from './ProductPickerModal';

interface ItemRow {
  id: string;
  product_id: string | null;
  quantity: string;
  unit_price: string;
  product: { name: string; image_path: string | null } | null;
}

export function LeadItemsEditor({ leadId, locked }: { leadId: string; locked?: boolean }) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('lead_items')
      .select('id, product_id, quantity, unit_price, product:products(name, image_path)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });
    setItems(
      ((data as any) ?? []).map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        quantity: String(row.quantity),
        unit_price: String(row.unit_price),
        product: row.product,
      }))
    );
    setLoading(false);
  }, [leadId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const updateLocal = (id: string, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  // Persists on blur, so there's never an "unsaved" value that a list
  // refresh (e.g. from adding another product) could silently discard.
  const handleBlurSave = async (row: ItemRow) => {
    if (Number.isNaN(Number(row.quantity)) || Number.isNaN(Number(row.unit_price))) return;
    await supabase
      .from('lead_items')
      .update({ quantity: Number(row.quantity), unit_price: Number(row.unit_price) })
      .eq('id', row.id);
  };

  const handleRemoveRow = (id: string) => {
    Alert.alert('Remove product', 'Remove this product from the lead?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('lead_items').delete().eq('id', id);
          if (error) {
            Alert.alert('Could not remove', error.message);
            return;
          }
          setItems((prev) => prev.filter((i) => i.id !== id));
        },
      },
    ]);
  };

  const handleAddProduct = async (product: Product) => {
    setPickerVisible(false);
    const { data, error } = await supabase
      .from('lead_items')
      .insert({
        lead_id: leadId,
        product_id: product.id,
        quantity: 1,
        unit_price: Number(product.price),
      })
      .select('id')
      .single();
    if (error || !data) {
      Alert.alert('Could not add product', error?.message ?? 'Unknown error');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: data.id,
        product_id: product.id,
        quantity: '1',
        unit_price: String(product.price),
        product: { name: product.name, image_path: product.image_path },
      },
    ]);
  };

  const total = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0
  );

  if (loading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Products</Text>
        {!locked && (
          <TouchableOpacity onPress={() => setPickerVisible(true)}>
            <Text style={styles.addButton}>+ Add product</Text>
          </TouchableOpacity>
        )}
      </View>

      {locked && (
        <Text style={styles.lockedNotice}>
          This lead is closed (Won/Lost) — products are locked.
        </Text>
      )}

      {items.length === 0 && (
        <Text style={styles.empty}>No products yet. Add one to start building a quotation.</Text>
      )}

      {items.map((item) => {
        const imageUrl = productImageUrl(item.product?.image_path ?? null);
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <Text style={styles.productName} numberOfLines={1}>
                {item.product?.name ?? 'Unknown product'}
              </Text>
              {!locked && (
                <TouchableOpacity onPress={() => handleRemoveRow(item.id)} hitSlop={8}>
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputsRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Qty"
                keyboardType="numeric"
                value={item.quantity}
                editable={!locked}
                onChangeText={(v) => updateLocal(item.id, { quantity: v })}
                onBlur={() => handleBlurSave(items.find((i) => i.id === item.id)!)}
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Unit price"
                keyboardType="numeric"
                value={item.unit_price}
                editable={!locked}
                onChangeText={(v) => updateLocal(item.id, { unit_price: v })}
                onBlur={() => handleBlurSave(items.find((i) => i.id === item.id)!)}
              />
            </View>
          </View>
        );
      })}

      {items.length > 0 && <Text style={styles.total}>Total: {formatCurrency(total)}</Text>}

      <ProductPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddProduct}
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
  addButton: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  empty: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  lockedNotice: { fontSize: 12, color: '#d97706', marginBottom: 10 },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  thumb: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#e2e8f0' },
  thumbPlaceholder: {},
  productName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  remove: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  inputsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  inputFlex: { flex: 1 },
  total: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 4 },
});
