import { Stack } from 'expo-router';

export default function ExpensesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f0f23' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
