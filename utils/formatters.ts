import { format, parseISO } from 'date-fns';

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd MMM');
  } catch {
    return dateString;
  }
}

export function formatPrice(amountEur: number): string {
  return `€${amountEur.toFixed(2)}`;
}

export function formatWeight(kg: number): string {
  return `${kg} kg`;
}

export function formatPhone(phone: string): string {
  // Basic formatting
  return phone.replace(/(\+\d{1,3})(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Returns today's date as a local-time ISO date string (YYYY-MM-DD).
 *
 * Using `new Date().toISOString()` is incorrect because it returns the UTC
 * date, which can differ from the local date by ±1 day near midnight. This
 * helper uses the device's local calendar instead.
 */
export function localTodayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function countryCodeToFlagEmoji(code: string): string {
  return code.toUpperCase().split('')
    .map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}
