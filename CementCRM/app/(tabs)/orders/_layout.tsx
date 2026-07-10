import { Stack } from 'expo-router';
import { SignOutButton } from '../../../components/SignOutButton';

export default function OrdersLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Orders', headerRight: () => <SignOutButton /> }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Order' }} />
    </Stack>
  );
}
