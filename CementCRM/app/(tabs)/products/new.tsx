import { useRouter } from 'expo-router';
import { ProductForm, ProductFormValues } from '../../../components/ProductForm';
import { uploadProductImage } from '../../../lib/productImages';
import { supabase } from '../../../lib/supabase';

export default function NewProductScreen() {
  const router = useRouter();

  const handleSubmit = async (values: ProductFormValues) => {
    const { data, error } = await supabase
      .from('products')
      .insert({ name: values.name, price: values.price ? Number(values.price) : 0 })
      .select('id')
      .single();
    if (error) return error.message;

    if (values.localImageUri) {
      try {
        const path = await uploadProductImage(values.localImageUri, data.id);
        await supabase.from('products').update({ image_path: path }).eq('id', data.id);
      } catch (e: any) {
        return `Product created, but image upload failed: ${e.message ?? e}`;
      }
    }

    router.back();
    return null;
  };

  return <ProductForm submitLabel="Create product" onSubmit={handleSubmit} />;
}
