import { Stack } from 'expo-router';

export default function InvestmentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f0f23' } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
