import { describe, it, expect } from 'vitest';
import { bookingSubmitSchema } from '@/utils/validators';

const validCashBooking = {
  route_id: 'r1',
  collection_stop_id: 's1',
  dropoff_stop_id: 's2',
  collection_service_id: 'svc1',
  delivery_service_id: 'svc2',
  sender_name: 'Amine',
  sender_phone: '+33612345678',
  recipient_name: 'Sara',
  recipient_phone: '+21620123456',
  package_weight_kg: 5,
  package_category: 'general',
  payment_type: 'cash_on_collection',
  total_price: 42.5,
};

describe('bookingSubmitSchema', () => {
  it('accepts a valid cash booking', () => {
    expect(bookingSubmitSchema.safeParse(validCashBooking).success).toBe(true);
  });

  it('accepts cash_on_delivery', () => {
    const r = bookingSubmitSchema.safeParse({ ...validCashBooking, payment_type: 'cash_on_delivery' });
    expect(r.success).toBe(true);
  });

  it('rejects card/PayPal at launch (coming soon)', () => {
    for (const pt of ['credit_debit_card', 'paypal']) {
      const r = bookingSubmitSchema.safeParse({ ...validCashBooking, payment_type: pt });
      expect(r.success).toBe(false);
    }
  });

  it('rejects missing stop/service selections', () => {
    const r = bookingSubmitSchema.safeParse({ ...validCashBooking, collection_stop_id: '' });
    expect(r.success).toBe(false);
  });

  it('rejects out-of-range weight', () => {
    expect(bookingSubmitSchema.safeParse({ ...validCashBooking, package_weight_kg: 0 }).success).toBe(false);
    expect(bookingSubmitSchema.safeParse({ ...validCashBooking, package_weight_kg: 201 }).success).toBe(false);
  });
});
