import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * MASCOTAS GO — Supabase Client Configuration
 * 
 * Configures the public client for Supabase Auth, PostgreSQL (via PostgREST/client)
 * and Supabase Storage.
 * 
 * Safety Rules:
 * - Only uses public anon key on the client (VITE_SUPABASE_ANON_KEY).
 * - Never exposes service_role key to the frontend.
 * - Provides clear diagnostic error messages when variables are missing.
 */

// Helper to safely read env vars in both browser (Vite) and Node.js environments
function getEnvVar(key: string): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
}

export const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes('TU_SUPABASE') &&
  !SUPABASE_ANON_KEY.includes('TU_ANON_KEY')
);

let _supabaseClient: SupabaseClient | null = null;

/**
 * Returns the initialized Supabase client, or throws a clear error if unconfigured.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) {
    return _supabaseClient;
  }

  if (!isSupabaseConfigured) {
    const errorDetails = [
      !SUPABASE_URL ? 'Falta VITE_SUPABASE_URL' : null,
      !SUPABASE_ANON_KEY ? 'Falta VITE_SUPABASE_ANON_KEY' : null,
    ].filter(Boolean).join(', ');

    throw new Error(
      `[Supabase Client Error] Variables de entorno incompletas (${errorDetails}). ` +
      'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu entorno o panel de configuración.'
    );
  }

  _supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });

  return _supabaseClient;
}

/**
 * Safe singleton instance: Returns the Supabase client when configured,
 * or null when running in unconfigured mode (allowing offline / guest fallback).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null;
