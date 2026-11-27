import type { Profile } from '@/types/models';
import { normalizePhoneNumber, splitPhone } from '@/utils/phone';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/utils/phoneCountries';
import type { ProfileFormData } from '@/utils/validators';

type ProfileFields = Pick<Profile, 'full_name' | 'phone' | 'phone_country_code' | 'phone_number' | 'country_code'>;
type ProfileUpdate = Pick<Profile, 'full_name' | 'phone' | 'phone_country_code' | 'phone_number' | 'country_code'>;

/** Form values for Edit Profile. Profiles saved before migration 060 fall back to splitting `phone`. */
export function toProfileFormValues(profile: ProfileFields | null): ProfileFormData {
  const parts = splitPhone(profile?.phone ?? '');
  return {
    fullName: profile?.full_name ?? '',
    countryCode: profile?.phone_country_code ?? parts.countryCode ?? DEFAULT_PHONE_COUNTRY_CODE,
    phoneNumber: profile?.phone_number ?? parts.number,
    countryIso: profile?.country_code ?? '',
  };
}

/** Row update for the profiles table. An empty number clears all three phone columns. */
export function toProfileUpdate(values: ProfileFormData): ProfileUpdate {
  const number = normalizePhoneNumber(values.phoneNumber);
  return {
    full_name: values.fullName.trim(),
    phone: number ? `${values.countryCode}${number}` : null,
    phone_country_code: number ? values.countryCode : null,
    phone_number: number || null,
    country_code: values.countryIso || null,
  };
}
