import { useRouter } from 'expo-router';
import { LeadForm, LeadFormValues } from '../../../components/LeadForm';
import { supabase } from '../../../lib/supabase';

export default function NewLeadScreen() {
  const router = useRouter();

  const handleSubmit = async (values: LeadFormValues) => {
    const { error } = await supabase.from('leads').insert({
      account_id: values.account_id,
      stage: values.stage,
      product_id: values.product_id || null,
      quantity: values.quantity ? Number(values.quantity) : null,
      unit_price: values.unit_price ? Number(values.unit_price) : null,
      expected_order_date: values.expected_order_date || null,
    });
    if (error) return error.message;
    router.back();
    return null;
  };

  return <LeadForm submitLabel="Create lead" onSubmit={handleSubmit} />;
}
