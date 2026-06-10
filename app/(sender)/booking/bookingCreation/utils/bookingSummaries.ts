export const SERVICE_TYPE_LABEL: Record<string, string> = {
  sender_dropoff: 'Drop-off at meeting point',
  driver_pickup: 'Driver pickup',
  recipient_collects: 'Recipient self-collects',
  driver_delivery: 'Door delivery',
  local_post: 'Local post',
};

export function getItinerarySummary(collectionCity: string, dropoffCity: string): string {
  if (!collectionCity || !dropoffCity) return '';
  return `${collectionCity} → ${dropoffCity}`;
}

export function getLogisticsSummary(
  stopServices: { id: string; service_type: string | null }[],
  deliveryServices: { id: string; service_type: string | null }[],
  collectionServiceId: string | null,
  deliveryServiceId: string | null,
): string {
  const coll = stopServices.find((s) => s.id === collectionServiceId);
  const delv = deliveryServices.find((s) => s.id === deliveryServiceId);
  return [
    coll?.service_type ? (SERVICE_TYPE_LABEL[coll.service_type] ?? coll.service_type) : null,
    delv?.service_type ? (SERVICE_TYPE_LABEL[delv.service_type] ?? delv.service_type) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function getSenderSummary(
  senderMode: string,
  senderName: string,
  senderCC: string,
  senderPhone: string,
  behalfName: string,
  behalfCC: string,
  behalfPhone: string,
): string {
  return senderMode === 'own'
    ? `${senderName || '—'} · ${senderCC} ${senderPhone || ''}`
    : `${behalfName} · ${behalfCC} ${behalfPhone}`;
}

export function getPackageSummary(weight: string, packageTypes: string[]): string {
  if (!weight) return '';
  return `${weight} kg · ${packageTypes.join(', ') || '—'}`;
}

export function getRecipientSummary(name: string, cc: string, phone: string): string {
  if (!name) return '';
  return `${name} · ${cc} ${phone}`;
}
