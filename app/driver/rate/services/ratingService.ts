import { supabase } from '@/lib/supabase';

export interface RatingPayload {
  bookingId: string;
  score: number;
  comment?: string;
}

export interface RatingResult {
  success: boolean;
  message: string;
  isUpdate: boolean;
}

/**
 * Submit or update a rating for a booking
 * If rating exists, updates it; otherwise creates new rating
 */
export async function submitRating(
  payload: RatingPayload,
  driverId: string
): Promise<RatingResult> {
  const { bookingId, score, comment } = payload;

  // Get booking with sender_id
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, sender_id')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`Booking not found: ${bookingError?.message || 'unknown error'}`);
  }

  const senderId = (booking as any).sender_id;
  if (!senderId) {
    throw new Error('Sender not found for this booking');
  }

  // Check if rating already exists
  const { data: existingRating, error: checkError } = await supabase
    .from('ratings')
    .select('id')
    .eq('booking_id', bookingId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  const isUpdate = !!existingRating;

  if (isUpdate) {
    // Update existing rating
    const { error: updateError } = await supabase
      .from('ratings')
      .update({
        score,
        comment: comment?.trim() || null,
      })
      .eq('booking_id', bookingId);

    if (updateError) throw updateError;
  } else {
    // Insert new rating
    const { error: insertError } = await supabase.from('ratings').insert({
      booking_id: bookingId,
      sender_id: senderId,
      driver_id: driverId,
      score,
      comment: comment?.trim() || null,
    });

    if (insertError) throw insertError;
  }

  return {
    success: true,
    message: 'Rating submitted successfully',
    isUpdate,
  };
}
