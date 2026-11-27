export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred';
  const msg = (error as { message?: string }).message ?? '';
  const code = (error as { code?: string }).code ?? '';

  if (msg.includes('Invalid login credentials')) return 'Invalid email or password';
  if (msg.includes('Email not confirmed')) return 'Please verify your email first';
  if (msg.includes('User already registered') || code === 'user_already_exists') {
    return 'An account with this email already exists';
  }
  if (msg.includes('Password should be') || code === 'weak_password') {
    return 'Password must be at least 8 characters';
  }
  if (code === 'same_password' || msg.includes('should be different from the old password')) {
    return 'New password must be different from the current one';
  }
  if (msg.includes('Auth session missing') || code === 'session_not_found') {
    return 'Your session has expired. Please sign in again';
  }
  if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
    return 'No internet connection';
  }
  if (msg.includes('over_email_send_rate_limit') || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many attempts. Please wait before trying again';
  }
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
