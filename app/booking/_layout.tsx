import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerShadowVisible: false,
        headerTintColor: Colors.text.primary,
        headerBackTitle: '',
      }}
    />
  );
}
