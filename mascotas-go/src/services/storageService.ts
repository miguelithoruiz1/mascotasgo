/**
 * MASCOTAS GO — Supabase Storage Service & Access Policies
 * 
 * Reglas de seguridad:
 * - NO hacer público todo el contenido por defecto.
 * - 'user-pets/': PRIVADO. Solo accesible y modificable por el propietario de la mascota.
 * - 'avatars/': LECTURA PÚBLICA, ESCRITURA PRIVADA (solo el propio usuario).
 * - 'lost-pets/': LECTURA PÚBLICA (radar de rescate), ESCRITURA EXCLUSIVA de usuarios autenticados.
 * - Validación estricta de MIME type (JPEG, PNG, WebP) y tamaño (máx 5MB).
 * - Fallback automático a base64 / almacenamiento local cuando Supabase Storage no está configurado.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

export const MEDIA_BUCKET = 'mascotas-media';

export type StorageCategory = 'user-pets' | 'lost-pets' | 'avatars';

export interface UploadResult {
  url: string;
  path: string;
  storageProvider: 'supabase' | 'local_data_url';
  isPrivate: boolean;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Valida formato y peso de archivo antes de procesar o enviar a la nube.
 */
export function validateMediaFile(fileOrBlob: { size: number; type: string }): void {
  if (fileOrBlob.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`El archivo excede el tamaño máximo permitido de 5 MB (${(fileOrBlob.size / 1024 / 1024).toFixed(2)} MB recibidos).`);
  }
  if (!ALLOWED_MIME_TYPES.includes(fileOrBlob.type)) {
    throw new Error(`Tipo de archivo no permitido: ${fileOrBlob.type}. Tipos aceptados: JPEG, PNG, WebP.`);
  }
}

/**
 * Sube una fotografía o avatar a Supabase Storage con control de acceso por carpeta.
 * Si Supabase no está configurado, o en caso de error de red, genera un DataURL local como fallback seguro.
 */
export async function uploadMedia(
  file: Blob | File,
  category: StorageCategory,
  userId: string,
  resourceId: string
): Promise<UploadResult> {
  validateMediaFile(file);

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${resourceId}.${ext}`;
  
  // Estructura de carpetas jerárquica con control de acceso por usuario
  const filePath = category === 'avatars'
    ? `avatars/${userId}.${ext}`
    : `${category}/${userId}/${fileName}`;

  const isPrivate = category === 'user-pets';

  // Si Supabase no está configurado o no hay cliente, usar fallback local
  if (!isSupabaseConfigured || !supabase) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          path: filePath,
          storageProvider: 'local_data_url',
          isPrivate,
        });
      };
      reader.onerror = () => reject(new Error('Fallo al leer la imagen local'));
      reader.readAsDataURL(file);
    });
  }

  // Intento de subida a Supabase Storage
  try {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.warn(`[Supabase Storage] Fallo en la subida a ${filePath}:`, error.message);
      throw error;
    }

    if (isPrivate) {
      // Para fotos privadas de mascotas del usuario: genera URL firmada temporal de 1 hora
      const { data: signedData, error: signedError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(data.path, 3600);

      if (signedError || !signedData?.signedUrl) {
        throw signedError || new Error('No se pudo generar la URL firmada');
      }

      return {
        url: signedData.signedUrl,
        path: data.path,
        storageProvider: 'supabase',
        isPrivate: true,
      };
    } else {
      // Para avatares y rescates comunitarios SOS: URL pública
      const { data: publicData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(data.path);

      return {
        url: publicData.publicUrl,
        path: data.path,
        storageProvider: 'supabase',
        isPrivate: false,
      };
    }
  } catch (err) {
    console.warn('[Supabase Storage] Activando fallback seguro a almacenamiento local:', err);
    // Degradar a DataURL local para no interrumpir el flujo del usuario
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          path: filePath,
          storageProvider: 'local_data_url',
          isPrivate,
        });
      };
      reader.readAsDataURL(file);
    });
  }
}
