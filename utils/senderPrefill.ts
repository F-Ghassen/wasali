export interface SenderPrefill {
  name: string;
  countryCode: string | null;
  number: string | null;
}

interface SenderFields {
  senderName: string;
  senderCC: string;
  senderPhone: string;
}

/**
 * Fills the sender's name and phone from the profile, but only where the form
 * is still empty, so a value the user typed is never overwritten.
 * Returns the same object when there is nothing to fill.
 */
export function prefillEmptySender<T extends SenderFields>(state: T, profile: SenderPrefill): T {
  const fillName = state.senderName === '' && profile.name !== '';
  const { countryCode, number } = profile;
  const fillPhone = state.senderPhone === '' && !!countryCode && !!number;
  if (!fillName && !fillPhone) return state;

  return {
    ...state,
    senderName: fillName ? profile.name : state.senderName,
    senderCC: fillPhone && countryCode ? countryCode : state.senderCC,
    senderPhone: fillPhone && number ? number : state.senderPhone,
  };
}
