import { describe, it, expect } from 'vitest';
import { prefillEmptySender } from '@/utils/senderPrefill';
import { migrateBookingDraft } from '@/utils/bookingDraft';

const profile = { name: 'Amel Ben', countryCode: '+216', number: '55000111' };
const empty = { senderName: '', senderCC: '+49', senderPhone: '' };

describe('prefillEmptySender', () => {
  it('fills an empty form from the profile', () => {
    expect(prefillEmptySender(empty, profile)).toEqual({
      senderName: 'Amel Ben',
      senderCC: '+216',
      senderPhone: '55000111',
    });
  });

  it('never overwrites values the user already typed', () => {
    const typed = { senderName: 'Other', senderCC: '+33', senderPhone: '612345678' };
    expect(prefillEmptySender(typed, profile)).toBe(typed);
  });

  it('leaves the phone empty when the profile has no country code', () => {
    const result = prefillEmptySender(empty, { name: 'Amel', countryCode: null, number: '55000111' });
    expect(result).toEqual({ senderName: 'Amel', senderCC: '+49', senderPhone: '' });
  });

  it('returns the same object when the profile has nothing to add', () => {
    expect(prefillEmptySender(empty, { name: '', countryCode: null, number: null })).toBe(empty);
  });
});

describe('migrateBookingDraft', () => {
  it('drops the removed fields from an own-mode draft', () => {
    const draft = {
      senderMode: 'own',
      senderName: 'Amel',
      behalfName: '',
      behalfCC: '+49',
      behalfPhone: '',
      behalfWhatsapp: false,
      saveBehalfToContacts: true,
      weight: '4',
    };
    expect(migrateBookingDraft(draft)).toEqual({ senderName: 'Amel', weight: '4' });
  });

  it('moves the behalf details into the sender fields for a behalf draft', () => {
    const draft = {
      senderMode: 'behalf',
      senderName: '',
      senderCC: '+49',
      senderPhone: '',
      senderWhatsapp: false,
      behalfName: 'Bob',
      behalfCC: '+216',
      behalfPhone: '67890',
      behalfWhatsapp: true,
      saveBehalfToContacts: true,
    };
    expect(migrateBookingDraft(draft)).toEqual({
      senderName: 'Bob',
      senderCC: '+216',
      senderPhone: '67890',
      senderWhatsapp: true,
    });
  });
});
