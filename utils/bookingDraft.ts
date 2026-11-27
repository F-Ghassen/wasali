const REMOVED_BEHALF_KEYS = [
  'senderMode',
  'behalfName',
  'behalfCC',
  'behalfPhone',
  'behalfWhatsapp',
  'saveBehalfToContacts',
];

/**
 * Converts a draft saved before the "on behalf of someone" option was removed.
 * A draft that was filling in someone else's details keeps those as the sender.
 */
export function migrateBookingDraft(draft: Record<string, unknown>): Record<string, unknown> {
  const rest = Object.fromEntries(
    Object.entries(draft).filter(([key]) => !REMOVED_BEHALF_KEYS.includes(key)),
  );
  if (draft.senderMode !== 'behalf') return rest;

  return {
    ...rest,
    senderName: draft.behalfName,
    senderCC: draft.behalfCC,
    senderPhone: draft.behalfPhone,
    senderWhatsapp: draft.behalfWhatsapp,
  };
}
