import { Stack } from 'expo-router';
import { SignOutButton } from '../../../components/SignOutButton';

export default function ProductsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Products', headerRight: () => <SignOutButton /> }}
      />
      <Stack.Screen name="new" options={{ title: 'New Product', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Product' }} />
    </Stack>
  );
}
