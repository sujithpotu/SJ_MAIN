import { useRouter } from 'expo-router';
import { AccountForm, AccountFormValues } from '../../../components/AccountForm';
import { supabase } from '../../../lib/supabase';

export default function NewAccountScreen() {
  const router = useRouter();

  const handleSubmit = async (values: AccountFormValues) => {
    const { error } = await supabase.from('accounts').insert(values);
    if (error) return error.message;
    router.back();
    return null;
  };

  return <AccountForm submitLabel="Create account" onSubmit={handleSubmit} />;
}
