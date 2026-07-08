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
  dirty: boolean;
}

export function LeadItemsEditor({ leadId }: { leadId: string }) {
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
        dirty: false,
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
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, dirty: true } : i)));

  const handleSaveRow = async (row: ItemRow) => {
    if (Number.isNaN(Number(row.quantity)) || Number.isNaN(Number(row.unit_price))) {
      Alert.alert('Invalid values', 'Quantity and unit price must be numbers.');
      return;
    }
    const { error } = await supabase
      .from('lead_items')
      .update({ quantity: Number(row.quantity), unit_price: Number(row.unit_price) })
      .eq('id', row.id);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, dirty: false } : i)));
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
          load();
        },
      },
    ]);
  };

  const handleAddProduct = async (product: Product) => {
    setPickerVisible(false);
    const { error } = await supabase.from('lead_items').insert({
      lead_id: leadId,
      product_id: product.id,
      quantity: 1,
      unit_price: Number(product.price),
    });
    if (error) {
      Alert.alert('Could not add product', error.message);
      return;
    }
    load();
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
        <TouchableOpacity onPress={() => setPickerVisible(true)}>
          <Text style={styles.addButton}>+ Add product</Text>
        </TouchableOpacity>
      </View>

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
              <TouchableOpacity onPress={() => handleRemoveRow(item.id)} hitSlop={8}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputsRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Qty"
                keyboardType="numeric"
                value={item.quantity}
                onChangeText={(v) => updateLocal(item.id, { quantity: v })}
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Unit price"
                keyboardType="numeric"
                value={item.unit_price}
                onChangeText={(v) => updateLocal(item.id, { unit_price: v })}
              />
              {item.dirty && (
                <TouchableOpacity style={styles.saveButton} onPress={() => handleSaveRow(item)}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              )}
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
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  total: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 4 },
});
