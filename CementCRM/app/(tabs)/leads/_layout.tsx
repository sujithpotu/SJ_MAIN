import { Stack } from 'expo-router';
import { SignOutButton } from '../../../components/SignOutButton';

export default function LeadsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Leads', headerRight: () => <SignOutButton /> }}
      />
      <Stack.Screen name="new" options={{ title: 'New Lead', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Lead' }} />
    </Stack>
  );
}
