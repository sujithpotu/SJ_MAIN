import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const BUCKET = 'product-images';

export function productImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

export async function uploadProductImage(localUri: string, productId: string): Promise<string> {
  const extMatch = localUri.match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const path = `${productId}/${Date.now()}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });

  if (error) throw error;
  return path;
}
