import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background.primary },
        headerShadowVisible: false,
        headerTintColor: Colors.text.primary,
        headerBackTitle: '',
        headerTitle: '',
      }}
    />
  );
}
