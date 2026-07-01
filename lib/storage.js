import { supabase } from './supabase-client.js';

const BUCKET = 'product-images';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function uploadProductImage(file, productId) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('[storage.uploadProductImage] El archivo debe ser una imagen JPEG, PNG o WEBP.');
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('[storage.uploadProductImage] El archivo excede el tamaño máximo de 5MB.');
  }

  try {
    const path = `products/${productId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return { path, url: data.publicUrl };
  } catch (error) {
    throw new Error(`[storage.uploadProductImage] ${error.message}`);
  }
}

export async function deleteProductImage(path) {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return true;
  } catch (error) {
    throw new Error(`[storage.deleteProductImage] ${error.message}`);
  }
}

export function getPublicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
