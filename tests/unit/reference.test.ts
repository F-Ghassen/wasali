import { describe, it, expect } from 'vitest';
import { shortRef, tripId } from '@/utils/reference';

describe('shortRef', () => {
  it('formats WSL-XXXXXX from the first 6 hex chars, uppercased', () => {
    expect(shortRef('abcdef12-3456-7890-abcd-ef1234567890')).toBe('WSL-ABCDEF');
  });

  it('is deterministic for the same id', () => {
    const id = '9f8e7d6c-0000-0000-0000-000000000000';
    expect(shortRef(id)).toBe(shortRef(id));
    expect(shortRef(id)).toBe('WSL-9F8E7D');
  });

  it('distinct ids yield distinct refs', () => {
    expect(shortRef('111111aa-...')).not.toBe(shortRef('222222bb-...'));
  });
});

describe('tripId', () => {
  it('is the same scheme as shortRef (bookings and routes share the format)', () => {
    const id = 'deadbeef-1111-2222-3333-444455556666';
    expect(tripId(id)).toBe(shortRef(id));
    expect(tripId(id)).toBe('WSL-DEADBE');
  });
});
