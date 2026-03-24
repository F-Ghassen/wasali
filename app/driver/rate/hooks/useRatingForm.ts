import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { submitRating } from '../services/ratingService';
import type { RatingFormState, RatingFormActions } from '../types';
import type { UserRole } from '@/types/models';

interface UseRatingFormProps {
  bookingId: string;
  onSuccess?: (isUpdate: boolean) => void;
}

interface ExistingRating {
  score: number;
  comment: string | null;
}

export function useRatingForm({
  bookingId,
  onSuccess,
}: UseRatingFormProps): RatingFormState & RatingFormActions {
  const router = useRouter();
  const { session, profile } = useAuthStore();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExistingRating, setIsExistingRating] = useState(false);

  // Get user role from profile — either 'driver' or 'sender'
  const userRole = (profile?.role as UserRole) || 'sender';
  const ratorId = session?.user.id || '';

  // Load existing rating if it exists
  useEffect(() => {
    const loadExistingRating = async () => {
      try {
        console.log('[DEBUG] Loading rating for bookingId:', bookingId, 'ratorId:', ratorId, 'userRole:', userRole);

        // First get the booking to find sender and driver IDs
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('id, sender_id, route:routes(driver_id)')
          .eq('id', bookingId)
          .single();

        if (bookingError || !bookingData) {
          console.error('[DEBUG] Error loading booking:', bookingError);
          setIsLoading(false);
          return;
        }

        const senderId = (bookingData as any).sender_id;
        const driverId = ((bookingData as any).route as any)?.driver_id;

        console.log('[DEBUG] Booking loaded - senderId:', senderId, 'driverId:', driverId);
        console.log('[DEBUG] Querying rating with - sender_id:', userRole === 'driver' ? senderId : ratorId, 'driver_id:', userRole === 'driver' ? ratorId : driverId);

        // Now load the rating for this specific rater
        const { data, error: fetchError } = await supabase
          .from('ratings')
          .select('score, comment')
          .eq('booking_id', bookingId)
          .eq('sender_id', userRole === 'driver' ? senderId : ratorId)
          .eq('driver_id', userRole === 'driver' ? ratorId : driverId)
          .eq('rater_type', userRole)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('[DEBUG] Error loading rating:', fetchError);
          return;
        }

        if (data) {
          console.log('[DEBUG] Existing rating found:', data);
          const rating = data as ExistingRating;
          setScore(rating.score);
          setComment(rating.comment || '');
          setIsExistingRating(true);
          console.log('[DEBUG] Rating loaded - score:', rating.score, 'isExistingRating: true');
        } else {
          console.log('[DEBUG] No existing rating found (PGRST116 or empty)');
        }
      } catch (err) {
        console.error('[DEBUG] Failed to load existing rating:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingRating();
  }, [bookingId, ratorId, userRole]);

  const handleSubmit = async () => {
    console.log('[DEBUG] handleSubmit called - bookingId:', bookingId, 'ratorId:', ratorId, 'score:', score, 'comment:', comment);

    if (!bookingId || !ratorId) {
      setError('Missing booking or user information');
      console.log('[DEBUG] Missing booking or ratorId');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[DEBUG] Calling submitRating...');
      const result = await submitRating({
        payload: {
          bookingId,
          score,
          comment,
        },
        ratorId,
        ratorRole: userRole,
      });

      console.log('[DEBUG] submitRating result:', result);
      onSuccess?.(result.isUpdate);

      const redirectPath = userRole === 'driver' ? '/(driver-tabs)/bookings' : '/(tabs)/bookings';
      console.log('[DEBUG] Redirecting to:', redirectPath);
      router.push(redirectPath);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(errorMsg);
      console.error('[DEBUG] Rating submission error:', err);
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
    isExistingRating,
    handleSubmit,
    reset,
  };
}
