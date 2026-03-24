import { useState } from 'react';
import { useRouter } from 'expo-router';
import { submitRating } from '../services/ratingService';

interface UseRatingFormProps {
  bookingId: string;
  driverId: string;
  onSuccess?: () => void;
}

export function useRatingForm({ bookingId, driverId, onSuccess }: UseRatingFormProps) {
  const router = useRouter();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!bookingId || !driverId) {
      setError('Missing booking or driver information');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await submitRating(
        {
          bookingId,
          score,
          comment,
        },
        driverId
      );

      onSuccess?.();
      router.push('/(driver-tabs)/bookings');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(errorMsg);
      console.error('Rating submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setScore(5);
    setComment('');
    setError(null);
  };

  return {
    score,
    setScore,
    comment,
    setComment,
    isLoading,
    error,
    handleSubmit,
    reset,
  };
}
