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

/**
 * Uploads an image and returns its storage path (not a URL). The caller
 * resolves a renderable URL at the point of use — `getPublicUrl(path)` for
 * public buckets (e.g. `avatars`), or `createSignedUrl(path, ttl)` for
 * private ones (e.g. `package-photos`) — since whether a bucket is public
 * is a property of the bucket, not of this generic upload helper.
 */
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

  return data.path;
}
