import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled) return null;
  return result.assets[0];
}

export async function uploadImage(
  bucket: string,
  path: string,
  uri: string,
  base64: string | null | undefined
): Promise<string | null> {
  if (!base64) return null;

  const arrayBuffer = decode(base64);
  const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType, upsert: true });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  if (bucket === 'avatars') {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.path, 3600);

  return signedData?.signedUrl ?? null;
}
