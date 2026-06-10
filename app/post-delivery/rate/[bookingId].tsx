import { useLocalSearchParams } from 'expo-router';
import { RateScreen } from '@/components/rating/RateScreen';

export default function RateDriverScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  return (
    <RateScreen
      bookingId={bookingId || ''}
      title="How was your experience?"
      subtitle="Your feedback helps other senders make better choices."
      headerTitle="Rate Driver"
    />
  );
}
