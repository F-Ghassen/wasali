import { supabase } from '@/lib/supabase';

export async function updateProfileNamePhone(userId: string, name: string, phone: string): Promise<void> {
  await supabase.from('profiles').update({ full_name: name, phone }).eq('id', userId);
}
