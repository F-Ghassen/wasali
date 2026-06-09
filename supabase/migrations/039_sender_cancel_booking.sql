-- Allow senders to cancel their own bookings when status is still pending
CREATE POLICY "Sender can cancel own pending bookings" ON bookings
  FOR UPDATE
  USING (sender_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');
