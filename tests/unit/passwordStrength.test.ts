import { describe, it, expect } from 'vitest';
import { getPasswordChecks, getPasswordStrength } from '@/utils/passwordStrength';

describe('getPasswordChecks', () => {
  it('flags each rule independently', () => {
    expect(getPasswordChecks('Abcdefg1!')).toEqual({
      length: true,
      lowercase: true,
      uppercase: true,
      digit: true,
      symbol: true,
    });
    expect(getPasswordChecks('abc')).toEqual({
      length: false,
      lowercase: true,
      uppercase: false,
      digit: false,
      symbol: false,
    });
  });
});

describe('getPasswordStrength', () => {
  it('returns 0 for an empty password', () => {
    expect(getPasswordStrength('')).toBe(0);
  });

  it('scores short single-class passwords low', () => {
    expect(getPasswordStrength('abc')).toBe(0);
    expect(getPasswordStrength('abcdefgh')).toBe(1);
  });

  it('rewards length and character variety', () => {
    expect(getPasswordStrength('abcdefg1')).toBe(2);
    expect(getPasswordStrength('Abcdefg1')).toBe(3);
    expect(getPasswordStrength('Abcdefg1!')).toBe(3);
    expect(getPasswordStrength('Abcdefgh1!xy')).toBe(4);
  });
});
