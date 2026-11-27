import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/utils/phone';

/** Saves the sender's name and phone parts. The trigger in migration 060 derives `phone`. */
export async function updateProfileNamePhone(
  userId: string,
  name: string,
  phone: { countryCode: string; number: string },
): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      full_name: name,
      phone_country_code: phone.countryCode,
      phone_number: normalizePhoneNumber(phone.number),
    })
    .eq('id', userId);
}
