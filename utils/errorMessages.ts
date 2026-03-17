export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred';
  const msg = (error as { message?: string }).message ?? '';

  if (msg.includes('Invalid login credentials')) return 'Invalid email or password';
  if (msg.includes('Email not confirmed')) return 'Please verify your email first';
  if (msg.includes('User already registered')) return 'An account with this email already exists';
  if (msg.includes('Password should be')) return 'Password must be at least 8 characters';
  if (msg.includes('over_email_send_rate_limit')) return 'Too many attempts. Please wait before trying again';
  if (msg.includes('Token has expired')) return 'Code expired. Please request a new one';
  if (msg.includes('Token not found')) return 'Invalid code. Please try again';
  return msg || 'An unexpected error occurred';
}

export function getNetworkErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Network error';
  const msg = (error as { message?: string }).message ?? '';
  if (msg.includes('network') || msg.includes('fetch')) return 'No internet connection';
  return msg || 'Something went wrong. Please try again.';
}
