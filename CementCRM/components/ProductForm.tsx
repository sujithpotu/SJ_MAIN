import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { productImageUrl } from '../lib/productImages';
import { Product } from '../types/database';

export interface ProductFormValues {
  name: string;
  price: string;
  localImageUri: string | null;
}

interface Props {
  initial?: Product;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<string | null>;
}

export function ProductForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const existingImageUrl = productImageUrl(initial?.image_path ?? null);
  const previewUri = localImageUri ?? existingImageUrl;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to pick an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (price && Number.isNaN(Number(price))) {
      setError('Price must be a number.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await onSubmit({ name: name.trim(), price, localImageUri });
    setSubmitting(false);
    if (result) setError(result);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. OPC 53 Grade"
      />

      <Text style={styles.label}>Price (per unit)</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        placeholder="e.g. 380"
        keyboardType="numeric"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? 'Saving…' : submitLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  imagePicker: { alignSelf: 'center', marginBottom: 20 },
  image: { width: 140, height: 140, borderRadius: 12, backgroundColor: '#e2e8f0' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingHorizontal: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    color: '#0f172a',
  },
  error: { color: '#dc2626', marginBottom: 12, fontSize: 14 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
