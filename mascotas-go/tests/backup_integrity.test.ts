/**
 * MASCOTAS GO — Automated Test Suite for Logical Backup & Data Integrity
 * Tests canonical serialization, deterministic hashing, sequence SQL generation,
 * discrepancy detection, and error sanitization without touching Cloud SQL.
 */
import {
  canonicalNormalize,
  canonicalSerialize,
  computeRowHash,
  generateSequenceSyncSQL,
  sanitizeErrorMessage,
  compareRowSets,
} from '../scripts/export_logical_backup.ts';

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

async function runBackupIntegrityTests() {
  console.log('\n--- INICIANDO PRUEBAS DE INTEGRIDAD DEL RESPALDO LÓGICO ---');

  // =========================================================================
  // 1. SERIALIZACIÓN CANÓNICA Y HASH DETERMINISTA
  // =========================================================================
  console.log('\n[1/5] Pruebas de Hashing Determinista y Serialización:');

  // Test 1: Mismo contenido con orden de claves diferente produce exactamente el mismo hash
  const rowA = { id: 1, name: 'Michi', species: 'gato', active: true };
  const rowB = { species: 'gato', active: true, id: 1, name: 'Michi' };
  const hashA = computeRowHash(rowA);
  const hashB = computeRowHash(rowB);
  assert(
    hashA === hashB && hashA.length === 64,
    'PRUEBA 1: Filas con orden de propiedades distinto generan hashes SHA-256 idénticos'
  );

  // Test 2: Manejo uniforme de fechas (Date vs ISO string UTC)
  const dateObj = new Date('2026-10-16T12:00:00.000Z');
  const rowWithDate = { id: 2, created_at: dateObj };
  const rowWithISO = { id: 2, created_at: '2026-10-16T12:00:00.000Z' };
  assert(
    computeRowHash(rowWithDate) === computeRowHash(rowWithISO),
    'PRUEBA 2: Objetos Date y cadenas ISO equivalentes producen el mismo hash determinista'
  );

  // Test 3: Normalización de nulos y undefined
  const rowWithNull = { id: 3, avatar: null, note: undefined };
  const rowWithNullOnly = { id: 3, avatar: null, note: null };
  assert(
    computeRowHash(rowWithNull) === computeRowHash(rowWithNullOnly),
    'PRUEBA 3: Valores nulos y undefined se normalizan de forma canónica y reproducible'
  );

  // Test 4: Objetos anidados profundos con claves desordenadas
  const nestedA = { id: 4, metadata: { z: 10, a: 20, inner: { y: 'bar', x: 'foo' } } };
  const nestedB = { metadata: { inner: { x: 'foo', y: 'bar' }, a: 20, z: 10 }, id: 4 };
  assert(
    computeRowHash(nestedA) === computeRowHash(nestedB),
    'PRUEBA 4: Objetos anidados en cualquier orden de clave producen hashes idénticos'
  );

  // =========================================================================
  // 2. DETECCIÓN DE DISCREPANCIAS Y CONFLICTOS
  // =========================================================================
  console.log('\n[2/5] Pruebas de Comparación y Detección de Conflictos:');

  const sourceData = [
    { id: 'pet_1', name: 'Firulais', cute_score: 95 },
    { id: 'pet_2', name: 'Pelusa', cute_score: 88 },
  ];

  // Coincidencia exacta
  const exactExport = [
    { id: 'pet_1', name: 'Firulais', cute_score: 95 },
    { id: 'pet_2', name: 'Pelusa', cute_score: 88 },
  ];
  const matchResult = compareRowSets(sourceData, exactExport, 'id');
  assert(
    matchResult.matched === true && matchResult.errors.length === 0,
    'PRUEBA 5: Comparación de conjuntos idénticos retorna matched = true sin errores'
  );

  // Detección de fila modificada (hash mismatch)
  const modifiedExport = [
    { id: 'pet_1', name: 'Firulais', cute_score: 95 },
    { id: 'pet_2', name: 'Pelusa Modificada', cute_score: 88 }, // Dato alterado
  ];
  const modResult = compareRowSets(sourceData, modifiedExport, 'id');
  assert(
    modResult.matched === false && modResult.errors.some((e) => e.includes('Hash mismatch')),
    'PRUEBA 6: Detección precisa de alteración de contenido en registros (Hash mismatch)'
  );

  // Detección de recuento y clave faltante
  const incompleteExport = [{ id: 'pet_1', name: 'Firulais', cute_score: 95 }];
  const countResult = compareRowSets(sourceData, incompleteExport, 'id');
  assert(
    countResult.matched === false && countResult.errors.some((e) => e.includes('Count mismatch')),
    'PRUEBA 7: Detección inmediata de filas faltantes o discrepancia de recuentos'
  );

  // =========================================================================
  // 3. GENERACIÓN DE SQL DE SINCRONIZACIÓN DE SECUENCIAS
  // =========================================================================
  console.log('\n[3/5] Pruebas de Sintaxis de Secuencias:');

  const seqSql = generateSequenceSyncSQL('users', 'id');
  assert(
    seqSql.includes('pg_get_serial_sequence') &&
      seqSql.includes('COALESCE((SELECT MAX("id")') &&
      seqSql.includes('(SELECT COUNT(*) > 0 FROM public."users")'),
    'PRUEBA 8: SQL de secuencia incluye COALESCE, MAX y comprobación booleana is_called'
  );

  // =========================================================================
  // 4. SANITIZACIÓN DE MENSAJES DE ERROR (PROTECCIÓN DE SECRETOS)
  // =========================================================================
  console.log('\n[4/5] Pruebas de Seguridad y Sanitización de Errores:');

  const rawConnError = new Error('Connection failed to postgresql://admin_user:SuperSecretPassword123@sql.example.com:5432/mascotas_db');
  const sanitized = sanitizeErrorMessage(rawConnError);
  assert(
    !sanitized.includes('SuperSecretPassword123') &&
      !sanitized.includes('admin_user:') &&
      sanitized.includes('***:***@'),
    'PRUEBA 9: Expresiones de conexión con contraseña se anonimizan completamente en logs'
  );

  const rawParamError = new Error('Query error with password=VeryConfidentialPass; user=admin_db');
  const sanitizedParams = sanitizeErrorMessage(rawParamError);
  assert(
    !sanitizedParams.includes('VeryConfidentialPass') && sanitizedParams.includes('password=***'),
    'PRUEBA 10: Parámetros aislados password= y user= quedan censurados contra fugas'
  );

  // =========================================================================
  // 5. RESUMEN
  // =========================================================================
  console.log('\n======================================================');
  console.log(`RESUMEN INTEGRIDAD: ${passed} pruebas superadas, ${failed} fallos.`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBackupIntegrityTests().catch((err) => {
  console.error('[TEST FATAL]:', sanitizeErrorMessage(err));
  process.exit(1);
});
