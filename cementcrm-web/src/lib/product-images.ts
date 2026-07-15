import { createClient } from "@/lib/supabase/client";

const BUCKET = "product-images";

export function productImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${BUCKET}/${imagePath}`;
}

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const extMatch = file.name.match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  const path = `${productId}/${Date.now()}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}` });

  if (error) throw error;
  return path;
}
