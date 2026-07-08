import { Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <TouchableOpacity onPress={signOut} hitSlop={12} style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '600' }}>Sign out</Text>
    </TouchableOpacity>
  );
}
