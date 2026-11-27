export interface PasswordChecks {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  digit: boolean;
  symbol: boolean;
}

/** 0 = empty/very weak, 4 = strong. */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export const MIN_PASSWORD_LENGTH = 8;

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  const checks = getPasswordChecks(password);
  const classes = [checks.lowercase, checks.uppercase, checks.digit, checks.symbol].filter(Boolean).length;

  let score = 0;
  if (checks.length) score += 1;
  if (classes >= 2) score += 1;
  if (classes >= 3) score += 1;
  if (checks.length && password.length >= 12 && classes >= 3) score += 1;
  return score as PasswordStrength;
}
