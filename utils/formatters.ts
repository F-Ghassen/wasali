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
