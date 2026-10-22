import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Inicialización segura del cliente backend de Supabase para validación de tokens
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabaseBackend: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey && !supabaseUrl.includes('tu-proyecto')) {
  supabaseBackend = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Validador seguro de token Bearer:
 * 1. En pruebas automatizadas: Acepta 'test_token_' de forma determinista y aislada.
 * 2. Si Supabase está configurado: Valida la autenticidad del JWT mediante la API de Supabase Auth (getUser).
 * 3. Fallback de transición: Valida con Firebase Admin si el token proviene del proveedor anterior.
 */
async function verifyBearerToken(token: string): Promise<AuthenticatedUser | null> {
  // 1. Entorno de pruebas (estrictamente restringido a NODE_ENV === 'test')
  if (process.env.NODE_ENV === 'test' && token.startsWith('test_token_')) {
    const testUid = token.replace('test_token_', '');
    return {
      uid: testUid,
      email: `${testUid}@test.local`,
      name: 'Usuario de Prueba',
    };
  }

  // 2. Verificación autoritativa con Supabase Auth si está configurado
  if (supabaseBackend) {
    try {
      const { data, error } = await supabaseBackend.auth.getUser(token);
      if (!error && data?.user) {
        return {
          uid: data.user.id,
          email: data.user.email,
          name: (data.user.user_metadata?.full_name as string) || (data.user.user_metadata?.name as string) || 'Entrenador',
          rawUser: data.user,
        };
      }
    } catch (_supabaseErr) {
      // Continuar al fallback de transición si Supabase no reconoce el token
    }
  }

  // 3. Fallback de transición con Firebase mientras se completa el reemplazo
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || 'Entrenador',
      rawToken: decodedToken,
    };
  } catch (_fbErr) {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  const verifiedUser = await verifyBearerToken(token);
  if (!verifiedUser) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = verifiedUser;
  return next();
};

/**
 * Autenticación opcional para rutas públicas con enriquecimiento de datos de privacidad
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return next();
  }

  const verifiedUser = await verifyBearerToken(token);
  if (verifiedUser) {
    req.user = verifiedUser;
  }

  return next();
};
