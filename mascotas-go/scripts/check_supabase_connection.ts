import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface DiagnosticResult {
  envVars: {
    hasViteSupabaseUrl: boolean;
    hasViteSupabaseAnonKey: boolean;
    hasServiceRoleKey: boolean;
    hasDatabaseUrl: boolean;
    hasLegacySqlHost: boolean;
  };
  supabaseAuthPing: {
    tested: boolean;
    success: boolean;
    errorType?: 'CREDENTIALS' | 'NETWORK' | 'UNKNOWN';
    details?: string;
  };
  postgresConnection: {
    tested: boolean;
    success: boolean;
    errorType?: 'CREDENTIALS' | 'NETWORK' | 'SSL' | 'SCHEMA' | 'UNKNOWN';
    details?: string;
    existingTables?: string[];
  };
}

async function runDiagnostics(): Promise<DiagnosticResult> {
  const viteUrl = process.env.VITE_SUPABASE_URL;
  const viteAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  const sqlHost = process.env.SQL_HOST;

  const result: DiagnosticResult = {
    envVars: {
      hasViteSupabaseUrl: Boolean(viteUrl && viteUrl.trim() && !viteUrl.includes('tu-proyecto')),
      hasViteSupabaseAnonKey: Boolean(viteAnonKey && viteAnonKey.trim() && !viteAnonKey.includes('tu-anon-key')),
      hasServiceRoleKey: Boolean(serviceKey && serviceKey.trim() && !serviceKey.includes('tu-service-role')),
      hasDatabaseUrl: Boolean(databaseUrl && databaseUrl.trim() && !databaseUrl.includes('tu_proyecto')),
      hasLegacySqlHost: Boolean(sqlHost && sqlHost.trim()),
    },
    supabaseAuthPing: { tested: false, success: false },
    postgresConnection: { tested: false, success: false },
  };

  // 1. Probar Supabase Auth API pública si las variables están disponibles
  if (result.envVars.hasViteSupabaseUrl && result.envVars.hasViteSupabaseAnonKey) {
    result.supabaseAuthPing.tested = true;
    try {
      const client = createClient(viteUrl!, viteAnonKey!, {
        auth: { persistSession: false },
      });
      // Ping seguro a la API de Auth (obtener settings o sesión vacía)
      const { error } = await client.auth.getSession();
      if (error) {
        result.supabaseAuthPing.errorType = error.message.toLowerCase().includes('apikey')
          ? 'CREDENTIALS'
          : 'UNKNOWN';
        result.supabaseAuthPing.details = error.message;
      } else {
        result.supabaseAuthPing.success = true;
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('ENOTFOUND') || msg.includes('fetch failed')) {
        result.supabaseAuthPing.errorType = 'NETWORK';
      } else {
        result.supabaseAuthPing.errorType = 'UNKNOWN';
      }
      result.supabaseAuthPing.details = msg;
    }
  }

  // 2. Probar conexión PostgreSQL a Supabase si DATABASE_URL está definida
  if (result.envVars.hasDatabaseUrl) {
    result.postgresConnection.tested = true;
    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 8000,
      ssl: { rejectUnauthorized: false }, // Para diagnóstico inicial
    });

    try {
      const client = await pool.connect();
      try {
        const pingRes = await client.query('SELECT 1 as alive');
        if (pingRes.rows[0]?.alive === 1) {
          result.postgresConnection.success = true;

          // Verificar qué tablas existen actualmente en el esquema público
          const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
          `);
          result.postgresConnection.existingTables = tablesRes.rows.map((r) => r.table_name);
        }
      } finally {
        client.release();
        await pool.end();
      }
    } catch (dbErr: any) {
      await pool.end().catch(() => {});
      const msg = dbErr.message || '';
      const code = dbErr.code || '';

      if (code === '28P01' || msg.includes('password authentication failed') || msg.includes('SASL')) {
        result.postgresConnection.errorType = 'CREDENTIALS';
        result.postgresConnection.details = 'Error de autenticación (contraseña o usuario incorrecto).';
      } else if (msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || code === 'ECONNRESET') {
        result.postgresConnection.errorType = 'NETWORK';
        result.postgresConnection.details = 'Error de red o timeout al alcanzar el host de Supabase.';
      } else if (msg.includes('SSL') || msg.includes('certificate')) {
        result.postgresConnection.errorType = 'SSL';
        result.postgresConnection.details = 'Fallo en la negociación SSL.';
      } else {
        result.postgresConnection.errorType = 'UNKNOWN';
        result.postgresConnection.details = `Código: ${code} - ${msg}`;
      }
    }
  }

  return result;
}

runDiagnostics().then((res) => {
  console.log(JSON.stringify(res, null, 2));
}).catch((err) => {
  console.error('Diagnostic fatal error:', err.message);
  process.exit(1);
});
