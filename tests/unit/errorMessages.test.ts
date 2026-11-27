import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage } from '@/utils/errorMessages';

describe('getAuthErrorMessage', () => {
  it('maps known Supabase messages', () => {
    expect(getAuthErrorMessage({ message: 'Invalid login credentials' })).toBe('Invalid email or password');
    expect(getAuthErrorMessage({ message: 'User already registered' })).toBe(
      'An account with this email already exists',
    );
  });

  it('maps Supabase error codes', () => {
    expect(getAuthErrorMessage({ message: 'x', code: 'weak_password' })).toBe(
      'Password must be at least 8 characters',
    );
    expect(getAuthErrorMessage({ message: 'x', code: 'same_password' })).toBe(
      'New password must be different from the current one',
    );
    expect(getAuthErrorMessage({ message: 'x', code: 'over_request_rate_limit' })).toBe(
      'Too many attempts. Please wait before trying again',
    );
  });

  it('maps session and network failures', () => {
    expect(getAuthErrorMessage(new Error('Auth session missing!'))).toBe(
      'Your session has expired. Please sign in again',
    );
    expect(getAuthErrorMessage(new TypeError('Failed to fetch'))).toBe('No internet connection');
  });

  it('falls back to the raw message, then a generic one', () => {
    expect(getAuthErrorMessage({ message: 'Something odd' })).toBe('Something odd');
    expect(getAuthErrorMessage(null)).toBe('An unexpected error occurred');
  });
});
