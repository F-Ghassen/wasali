import { describe, it, expect } from 'vitest';
import {
  resetPasswordSchema,
  changePasswordSchema,
  changeEmailSchema,
  profileSchema,
} from '@/utils/validators';

describe('resetPasswordSchema', () => {
  it('accepts matching passwords of 8+ characters', () => {
    expect(resetPasswordSchema.safeParse({ password: 'secret123', confirmPassword: 'secret123' }).success).toBe(true);
  });

  it('rejects mismatched passwords on confirmPassword', () => {
    const result = resetPasswordSchema.safeParse({ password: 'secret123', confirmPassword: 'secret124' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['confirmPassword']);
      expect(result.error.issues[0].message).toBe('Passwords do not match');
    }
  });
});

describe('changePasswordSchema', () => {
  const base = { currentPassword: 'oldpass12', newPassword: 'newpass12', confirmPassword: 'newpass12' };

  it('accepts a valid change', () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a new password equal to the current one', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'samepass1',
      newPassword: 'samepass1',
      confirmPassword: 'samepass1',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['newPassword']);
  });

  it('requires the current password', () => {
    expect(changePasswordSchema.safeParse({ ...base, currentPassword: '' }).success).toBe(false);
  });
});

describe('changeEmailSchema', () => {
  it('validates the email format', () => {
    expect(changeEmailSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    expect(changeEmailSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('allows an empty phone (to clear it) and a valid one', () => {
    expect(profileSchema.safeParse({ fullName: 'Amel Ben', countryCode: '+216', phoneNumber: '', countryIso: '' }).success).toBe(true);
    expect(profileSchema.safeParse({ fullName: 'Amel Ben', countryCode: '+216', phoneNumber: '55 123 456', countryIso: '' }).success).toBe(true);
  });

  it('rejects a short name and a short non-empty number', () => {
    expect(profileSchema.safeParse({ fullName: 'A', countryCode: '+216', phoneNumber: '', countryIso: '' }).success).toBe(false);
    expect(profileSchema.safeParse({ fullName: 'Amel', countryCode: '+216', phoneNumber: '123', countryIso: '' }).success).toBe(false);
  });

  it('requires a known country code when a number is given', () => {
    expect(profileSchema.safeParse({ fullName: 'Amel', countryCode: '+999', phoneNumber: '55123456', countryIso: '' }).success).toBe(false);
    expect(profileSchema.safeParse({ fullName: 'Amel', countryCode: '', phoneNumber: '', countryIso: '' }).success).toBe(true);
  });
});

describe('profileSchema residence country', () => {
  it('accepts an empty or listed residence country', () => {
    expect(profileSchema.safeParse({ fullName: 'Amel', countryCode: '+216', phoneNumber: '', countryIso: '' }).success).toBe(true);
    expect(profileSchema.safeParse({ fullName: 'Amel', countryCode: '+216', phoneNumber: '', countryIso: 'TN' }).success).toBe(true);
  });

  it('rejects a residence country that is not in the list', () => {
    expect(profileSchema.safeParse({ fullName: 'Amel', countryCode: '+216', phoneNumber: '', countryIso: 'XX' }).success).toBe(false);
  });
});
