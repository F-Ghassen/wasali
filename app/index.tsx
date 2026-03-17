import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { session, profile, isInitialized } = useAuthStore();
  if (!isInitialized) return null;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href={profile.role === 'driver' ? '/(driver-tabs)' as any : '/(tabs)'} />;
}
