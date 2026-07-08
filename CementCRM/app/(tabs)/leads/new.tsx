import { useRouter } from 'expo-router';
import { LeadForm, LeadFormValues } from '../../../components/LeadForm';
import { supabase } from '../../../lib/supabase';

export default function NewLeadScreen() {
  const router = useRouter();

  const handleSubmit = async (values: LeadFormValues) => {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        account_id: values.account_id,
        stage: values.stage,
        expected_order_date: values.expected_order_date || null,
      })
      .select('id')
      .single();
    if (error) return error.message;
    router.replace(`/leads/${data.id}`);
    return null;
  };

  return <LeadForm submitLabel="Create lead" onSubmit={handleSubmit} />;
}
