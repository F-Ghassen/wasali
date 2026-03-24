import { supabase } from '@/lib/supabase';
import type { RatingPayload, RatingResult } from '../types';
import type { UserRole } from '@/types/models';

interface SubmitRatingParams {
  payload: RatingPayload;
  ratorId: string;
  ratorRole: UserRole;
}

/**
 * Submit or update a rating for a booking
 * Handles both driver→sender and sender→driver ratings
 * If rating exists, updates it; otherwise creates new rating
 * ratorRole is derived from the authenticated user's profile role
 */
export async function submitRating({
  payload,
  ratorId,
  ratorRole,
}: SubmitRatingParams): Promise<RatingResult> {
  const { bookingId, score, comment } = payload;

  console.log('[DEBUG] submitRating called:', { bookingId, ratorId, ratorRole, score, comment });

  // Fetch booking with related data
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, sender_id, route:routes(driver_id)')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`Booking not found: ${bookingError?.message || 'unknown error'}`);
  }

  const senderId = (booking as any).sender_id;
  const driverId = ((booking as any).route as any)?.driver_id;

  console.log('[DEBUG] Booking data:', { senderId, driverId });

  if (!senderId || !driverId) {
    throw new Error('Invalid booking: missing sender or driver');
  }

  // Check if rating already exists for this specific rater
  const filterSenderId = ratorRole === 'driver' ? senderId : ratorId;
  const filterDriverId = ratorRole === 'driver' ? ratorId : driverId;

  console.log('[DEBUG] Checking for existing rating with filters:', { booking_id: bookingId, sender_id: filterSenderId, driver_id: filterDriverId, rater_type: ratorRole });

  const { data: existingRating, error: checkError } = await supabase
    .from('ratings')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('sender_id', filterSenderId)
    .eq('driver_id', filterDriverId)
    .eq('rater_type', ratorRole)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('[DEBUG] Error checking existing rating:', checkError);
    throw checkError;
  }

  const isUpdate = !!existingRating;
  console.log('[DEBUG] isUpdate:', isUpdate, 'existingRating:', existingRating);

  if (isUpdate) {
    // Update existing rating
    console.log('[DEBUG] Updating rating with filters:', { booking_id: bookingId, sender_id: filterSenderId, driver_id: filterDriverId, score, comment });

    const { error: updateError } = await supabase
      .from('ratings')
      .update({
        score,
        comment: comment?.trim() || null,
      })
      .eq('booking_id', bookingId)
      .eq('sender_id', filterSenderId)
      .eq('driver_id', filterDriverId);

    if (updateError) {
      console.error('[DEBUG] Update error:', updateError);
      throw updateError;
    }
    console.log('[DEBUG] Update successful');
  } else {
    // Insert new rating
    const ratingData = {
      booking_id: bookingId,
      score,
      comment: comment?.trim() || null,
      rater_type: ratorRole,
      ...(ratorRole === 'driver'
        ? { driver_id: ratorId, sender_id: senderId }
        : { sender_id: ratorId, driver_id: driverId }),
    };

    console.log('[DEBUG] Inserting new rating:', ratingData);

    const { error: insertError } = await supabase.from('ratings').insert(ratingData);

    if (insertError) {
      console.error('[DEBUG] Insert error:', insertError);
      throw insertError;
    }
    console.log('[DEBUG] Insert successful');
  }

  return {
    success: true,
    message: 'Rating submitted successfully',
    isUpdate,
  };
}
