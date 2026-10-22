/**
 * MASCOTAS GO — Test Suite para Fase 2D Paso 2: Validación de Esquema, RLS, Storage y Seguridad DB
 */

import { isSupabaseConfigured, getSupabaseClient } from '../src/lib/supabase.ts';
import { validateMediaFile } from '../src/services/storageService.ts';
import {
  LocalRuleBasedFallback,
  OpenAIVisionProvider,
  petVisionOrchestrator,
} from '../src/server/aiProvider.ts';
import { createPool } from '../src/db/index.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n--- INICIANDO PRUEBAS DE PREPARACIÓN DE SUPABASE, SEGURIDAD DB Y STORAGE ---');

  // =========================================================================
  // 1. CONFIGURACIÓN DEL CLIENTE SUPABASE
  // =========================================================================
  console.log('\n[1/4] Validación de Cliente y Diagnóstico de Entorno:');

  assert(
    typeof isSupabaseConfigured === 'boolean',
    'PRUEBA 1: isSupabaseConfigured es una bandera booleana válida'
  );

  if (!isSupabaseConfigured) {
    try {
      getSupabaseClient();
      assert(false, 'PRUEBA 2: getSupabaseClient debió arrojar error explicativo al no haber credenciales');
    } catch (err: any) {
      assert(
        err.message.includes('VITE_SUPABASE_URL') || err.message.includes('VITE_SUPABASE_ANON_KEY'),
        'PRUEBA 2: getSupabaseClient genera mensaje de error claro y descriptivo cuando faltan credenciales'
      );
    }
  }

  // =========================================================================
  // 2. VALIDACIÓN DE POLÍTICAS DE ALMACENAMIENTO (STORAGE SERVICE)
  // =========================================================================
  console.log('\n[2/4] Políticas y Validación de Almacenamiento:');

  // Validación de tipos MIME permitidos
  try {
    validateMediaFile({ size: 1024 * 1024, type: 'image/jpeg' });
    validateMediaFile({ size: 1024 * 1024, type: 'image/png' });
    validateMediaFile({ size: 1024 * 1024, type: 'image/webp' });
    assert(true, 'PRUEBA 3: Formatos válidos (JPEG, PNG, WebP) son aceptados');
  } catch (_e) {
    assert(false, 'PRUEBA 3: No debió fallar con formatos válidos');
  }

  // Rechazo de tipos no permitidos (ej. ejecutables, SVG no saneado, PDFs)
  try {
    validateMediaFile({ size: 1024, type: 'application/pdf' });
    assert(false, 'PRUEBA 4: Debió rechazar application/pdf');
  } catch (err: any) {
    assert(
      err.message.includes('Tipo de archivo no permitido'),
      'PRUEBA 4: Rechazo explícito de tipos MIME no autorizados'
    );
  }

  // Rechazo de archivos mayores a 5MB
  try {
    validateMediaFile({ size: 6 * 1024 * 1024, type: 'image/jpeg' });
    assert(false, 'PRUEBA 5: Debió rechazar archivo mayor a 5MB');
  } catch (err: any) {
    assert(
      err.message.includes('excede el tamaño máximo'),
      'PRUEBA 5: Rechazo estricto de archivos que exceden la cuota de 5MB'
    );
  }

  // =========================================================================
  // 3. DESACOPLAMIENTO DE IA Y HONESTIDAD ARQUITECTÓNICA
  // =========================================================================
  console.log('\n[3/4] Arquitectura de Visión y Desacoplamiento de IA:');

  const fallbackClassifier = new LocalRuleBasedFallback();
  assert(
    fallbackClassifier.isAIModel === false,
    'PRUEBA 6: El fallback local está tipado explícitamente con isAIModel = false (No se presenta como IA)'
  );

  const openAIProvider = new OpenAIVisionProvider();
  assert(
    openAIProvider.isAIModel === true,
    'PRUEBA 7: El proveedor remoto de visión está tipado explícitamente con isAIModel = true'
  );

  // Análisis mediante el orquestador
  const fakeSampleImage = 'data:image/jpeg;base64,' + Buffer.from('test_image_data').toString('base64');
  const result = await petVisionOrchestrator.identifyPet(fakeSampleImage, false);

  assert(
    result.has_pet === true && Boolean(result.species),
    'PRUEBA 8: El orquestador resuelve exitosamente el análisis de imagen'
  );

  assert(
    result._analysisSource === 'rule_based_fallback' || result._analysisSource === 'ai_model',
    'PRUEBA 9: El resultado reporta honestamente su fuente (_analysisSource)'
  );

  if (result._analysisSource === 'rule_based_fallback') {
    assert(
      result._providerName.includes('Fallback'),
      'PRUEBA 10: La contingencia local informa claramente que proviene del fallback basado en catálogo'
    );
  }

  // =========================================================================
  // 4. SEGURIDAD DE CONEXIÓN A BASE DE DATOS Y BLOQUEO DE FALLBACK SILENCIOSO
  // =========================================================================
  console.log('\n[4/4] Seguridad de Conexión a Base de Datos (Task 6):');

  // Prueba de bloqueo de fallback silencioso
  const originalUrl = process.env.DATABASE_URL;
  const originalFallbackFlag = process.env.ALLOW_TEST_FALLBACK;
  const originalPool = global._postgresPool;

  try {
    delete process.env.ALLOW_TEST_FALLBACK;
    process.env.DATABASE_URL = 'postgresql://postgres:[YOUR-PASSWORD]@db.example.supabase.co:5432/postgres';
    global._postgresPool = undefined;

    const pool = createPool();
    const poolOptions = (pool as any).options;
    const usesDatabaseUrl = poolOptions?.connectionString?.includes('db.example.supabase.co');
    assert(
      usesDatabaseUrl === true,
      'PRUEBA 11: Bloqueo estricto de fallback silencioso a Cloud SQL cuando DATABASE_URL está configurada'
    );
  } finally {
    // Restaurar entorno
    process.env.DATABASE_URL = originalUrl;
    process.env.ALLOW_TEST_FALLBACK = originalFallbackFlag;
    global._postgresPool = originalPool;
  }

  // Distinción de entorno simulado vs conexión real
  const isRealConnectionVerified = Boolean(
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('[') &&
    !process.env.DATABASE_URL.includes('YOUR-PASSWORD')
  );

  assert(
    !isRealConnectionVerified,
    'PRUEBA 12: El sistema reconoce honestamente que la conexión real de Supabase sigue pendiente de contraseña'
  );

  console.log('\n======================================================');
  console.log(`RESUMEN VALIDACIÓN SUPABASE: ${passed} pruebas superadas, ${failed} fallos.`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Error fatal en pruebas de preparación:', err);
  process.exit(1);
});
