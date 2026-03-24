import { useLocalSearchParams } from 'expo-router';
import { RateScreen } from '@/app/rate/components/RateScreen';

export default function RateSenderScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  return (
    <RateScreen
      bookingId={bookingId || ''}
      title="How was your experience?"
      subtitle="Your feedback helps maintain a positive community."
      headerTitle="Rate Sender"
    />
  );
}
