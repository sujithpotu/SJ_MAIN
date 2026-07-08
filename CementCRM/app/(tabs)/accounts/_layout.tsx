import { Stack } from 'expo-router';
import { SignOutButton } from '../../../components/SignOutButton';

export default function AccountsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Accounts', headerRight: () => <SignOutButton /> }}
      />
      <Stack.Screen name="new" options={{ title: 'New Account', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Account' }} />
    </Stack>
  );
}
