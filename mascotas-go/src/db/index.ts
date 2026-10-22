import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool (Object Method)
export const createPool = () => {
  if (!global._postgresPool) {
    const rawDatabaseUrl = process.env.DATABASE_URL;
    const hasDatabaseUrl = Boolean(rawDatabaseUrl && rawDatabaseUrl.trim());

    if (hasDatabaseUrl) {
      const databaseUrl = rawDatabaseUrl!.trim();
      const hasPlaceholders =
        databaseUrl.includes('[') ||
        databaseUrl.includes(']') ||
        databaseUrl.includes('YOUR-PASSWORD') ||
        databaseUrl.includes('db-password') ||
        databaseUrl.includes('tu_proyecto');

      if (hasPlaceholders) {
        // En entorno de pruebas automatizadas simuladas: solo permitir si se solicita explícitamente para test de regresión
        if (process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_FALLBACK === 'true') {
          global._postgresPool = new Pool({
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DB_NAME,
            max: 10,
            connectionTimeoutMillis: 15000,
          });
        } else {
        // Bloqueo de seguridad: No cambiar silenciosamente a Cloud SQL.
        // No matar el proceso en el arranque para permitir que Express y Vite sirvan la interfaz web.
        console.warn(
          '[Database Security Warning] Se detectó "DATABASE_URL" configurada con marcadores de posición sin reemplazar (ej. "[YOUR-PASSWORD]"). ' +
          'Por seguridad, el sistema NO realizará fallback silencioso a Cloud SQL. Las consultas a la base de datos se dirigirán a Supabase y requerirán que completes la contraseña en AI Studio.'
        );

        global._postgresPool = new Pool({
          connectionString: databaseUrl,
          max: 10,
          connectionTimeoutMillis: 5000,
        });
        }
      } else {
        // Conexión legítima a Supabase PostgreSQL
        const isSupabaseHost = databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com');
        global._postgresPool = new Pool({
          connectionString: isSupabaseHost ? databaseUrl.replace(/[?&]sslmode=[^&]+/, '') : databaseUrl,
          ssl: isSupabaseHost ? { rejectUnauthorized: false } : undefined,
          max: 10,
          connectionTimeoutMillis: 15000,
        });
      }
    } else {
      // DATABASE_URL no fue definida en absoluto: usar configuración estándar local/Cloud SQL
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
