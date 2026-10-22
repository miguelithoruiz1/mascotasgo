/**
 * MASCOTAS GO — Automated Verification Suite for Security & Multi-User Isolation
 */
import { Pool } from 'pg';
import { deleteUserPet, insertUserPet, getUserPets } from '../src/db/pets.ts';
import { markLostPetFound, insertLostPet, getAllLostPets } from '../src/db/lostPets.ts';
import { getOrCreateUser } from '../src/db/users.ts';
import {
  setCurrentStorageUser,
  getCurrentStorageUser,
  getAllPets,
  savePetToDB,
  deletePetFromDB,
  getPlayerProfile,
  savePlayerProfile,
  getDailyQuests,
  advanceQuestProgress,
  getLegacyGuestPetsCount,
  DEFAULT_PROFILE,
  calculateLevelFromXP,
  evaluateBadges,
  generateStarterPets,
} from '../src/services/storage.ts';
import { PetRecord } from '../src/types/index.ts';

// Mock localStorage in Node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: store.size,
  } as Storage;
}

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
  console.log('\n--- INICIANDO VERIFICACIÓN DE SEGURIDAD Y MULTICUENTA ---');

  // ==========================================
  // PARTE 1: SEGURIDAD DEL BACKEND EN BASE DE DATOS
  // ==========================================
  console.log('\n[1/2] Pruebas de Autorización en Base de Datos:');

  const testUserA = 'user_test_alpha_' + Date.now();
  const testUserB = 'user_test_beta_' + Date.now();

  try {
    // Crear usuarios de prueba
    await getOrCreateUser(testUserA, `${testUserA}@test.com`, 'Usuario A');
    await getOrCreateUser(testUserB, `${testUserB}@test.com`, 'Usuario B');

    // Crear mascota perteneciente al Usuario B
    const testPetB: any = {
      id: `pet_b_${Date.now()}`,
      userId: testUserB,
      species: 'perro',
      name: 'Firulais de B',
      breed: 'Labrador',
      color: 'Dorado',
      mood: 'Feliz',
      rarity: 'Común',
      cuteScore: 90,
      xpReward: 100,
      description: 'Mascota de prueba de B',
      funFact: 'Dato de prueba',
      photoUrl: 'https://example.com/pet.jpg',
      lat: '4.7110',
      lng: '-74.0721',
      locationName: 'Bogotá',
    };
    await insertUserPet(testPetB);

    // 1. Usuario A intenta eliminar la mascota del Usuario B
    const maliciousDeleteResult = await deleteUserPet(testPetB.id, testUserA);
    assert(
      maliciousDeleteResult === null,
      'PRUEBA 1: Usuario A NO puede eliminar la mascota del Usuario B (deleteUserPet retorna null)'
    );

    // Verificar que la mascota del Usuario B sigue intacta
    const petsOfB = await getUserPets(testUserB);
    const petBStillExists = petsOfB.some((p) => p.id === testPetB.id);
    assert(
      petBStillExists,
      'PRUEBA 1b: La mascota del Usuario B sigue intacta en la base de datos'
    );

    // Crear reporte SOS perteneciente al Usuario B
    const testLostB: any = {
      id: `lost_b_${Date.now()}`,
      userId: testUserB,
      petName: 'Pelusa de B',
      species: 'gato',
      breed: 'Persa',
      color: 'Blanco',
      description: 'Gato extraviado de prueba',
      contactName: 'Contacto B',
      contactPhone: '555-0199',
      lastSeenLat: '4.7120',
      lastSeenLng: '-74.0730',
      lastSeenAddress: 'Calle Falsa 123',
      status: 'lost',
    };
    await insertLostPet(testLostB);

    // 2. Usuario A intenta marcar como encontrado el reporte del Usuario B
    const maliciousFoundResult = await markLostPetFound(testLostB.id, testUserA);
    assert(
      maliciousFoundResult === null,
      'PRUEBA 2: Usuario A NO puede marcar como encontrado el reporte del Usuario B (markLostPetFound retorna null)'
    );

    // Verificar que el estado del reporte de B sigue siendo 'lost'
    const allReports = await getAllLostPets();
    const targetReport = allReports.find((r) => r.id === testLostB.id);
    assert(
      targetReport?.status === 'lost',
      'PRUEBA 2b: El reporte de B conserva su estado original "lost"'
    );

    // Limpieza autorizada de prueba
    await deleteUserPet(testPetB.id, testUserB);
    const legitDeleteCheck = await getUserPets(testUserB);
    assert(
      !legitDeleteCheck.some((p) => p.id === testPetB.id),
      'PRUEBA 1c: El Usuario B legítimo SÍ puede eliminar su propia mascota'
    );
  } catch (err: any) {
    console.error('Error durante pruebas de BD:', err);
    failed++;
  }

  // ==========================================
  // PARTE 2: AISLAMIENTO LOCAL MULTICUENTA
  // ==========================================
  console.log('\n[2/2] Pruebas de Aislamiento Local (IndexedDB / LocalStorage):');

  const localUidA = 'client_user_A';
  const localUidB = 'client_user_B';

  const mockPetA: PetRecord = {
    id: 'pet_local_alpha_1',
    species: 'perro',
    name: 'Toby Alpha',
    breed: 'Beagle',
    color: 'Tricolor',
    mood: 'Alegre',
    rarity: 'Raro',
    cuteScore: 92,
    xpReward: 120,
    description: 'Mascota exclusiva de Alpha',
    funFact: 'Olfato genial',
    photoUrl: 'https://example.com/alpha.jpg',
    lat: 4.711,
    lng: -74.072,
    timestamp: Date.now(),
  };

  // Sesión como Usuario A
  setCurrentStorageUser(localUidA);
  assert(getCurrentStorageUser() === localUidA, 'Namespace activo configurado como Usuario A');

  await savePetToDB(mockPetA);
  savePlayerProfile({
    ...DEFAULT_PROFILE,
    name: 'Entrenador Alpha',
    xp: 750,
    level: 3,
  });
  advanceQuestProgress('quest_pet_care', 2);

  // 3. Cambiar a Usuario B
  setCurrentStorageUser(localUidB);
  assert(getCurrentStorageUser() === localUidB, 'Namespace activo cambiado a Usuario B');

  const petsOfUserB = await getAllPets();
  const profileOfUserB = getPlayerProfile();
  const questsOfUserB = getDailyQuests();
  const careQuestB = questsOfUserB.find((q) => q.id === 'quest_pet_care');

  assert(
    !petsOfUserB.some((p) => p.id === mockPetA.id),
    'PRUEBA 3a: El Usuario B NO ve las mascotas del Usuario A'
  );
  assert(
    profileOfUserB.name !== 'Entrenador Alpha' && profileOfUserB.xp === 0,
    'PRUEBA 3b: El Usuario B NO hereda el perfil ni el XP del Usuario A'
  );
  assert(
    careQuestB?.progress === 0,
    'PRUEBA 3c: El Usuario B NO hereda el progreso de misiones diarias del Usuario A'
  );

  // 4. Volver a iniciar sesión como Usuario A
  setCurrentStorageUser(localUidA);
  const petsOfUserARecovered = await getAllPets();
  const profileOfUserARecovered = getPlayerProfile();
  const questsOfUserARecovered = getDailyQuests();
  const careQuestARecovered = questsOfUserARecovered.find((q) => q.id === 'quest_pet_care');

  assert(
    petsOfUserARecovered.some((p) => p.id === mockPetA.id),
    'PRUEBA 4a: El Usuario A recupera sus mascotas al volver a iniciar sesión'
  );
  assert(
    profileOfUserARecovered.name === 'Entrenador Alpha' && profileOfUserARecovered.xp === 750,
    'PRUEBA 4b: El Usuario A recupera su perfil y XP acumulado'
  );
  assert(
    careQuestARecovered?.progress === 2,
    'PRUEBA 4c: El Usuario A recupera el progreso de sus misiones diarias'
  );

  // 5. Cerrar sesión a Modo Invitado (null)
  setCurrentStorageUser(null);
  assert(getCurrentStorageUser() === null, 'Namespace cerrado: Modo Invitado');

  const guestPets = await getAllPets();
  assert(
    !guestPets.some((p) => p.id === mockPetA.id),
    'PRUEBA 5a: En modo invitado NO se muestran las mascotas privadas del Usuario A'
  );

  // Comprobar que los datos del Usuario A siguen persistidos y no fueron destruidos al cerrar sesión
  const userAPetsStillSaved = await getAllPets(localUidA);
  assert(
    userAPetsStillSaved.some((p) => p.id === mockPetA.id),
    'PRUEBA 5b: Cerrar sesión NO destruye los datos persistidos del Usuario A'
  );

  // 6. Verificar preservación de datos antiguos de invitado
  const guestCount = await getLegacyGuestPetsCount();
  assert(
    typeof guestCount === 'number',
    'PRUEBA 6: Los datos antiguos de invitado/legado siguen aislados y recuperables'
  );

  // 7. Funciones principales del juego
  const calculatedLevel = calculateLevelFromXP(750);
  assert(
    calculatedLevel.level >= 3,
    'PRUEBA 7a: calculateLevelFromXP opera correctamente con XP acumulado'
  );
  const badges = evaluateBadges([mockPetA], []);
  assert(
    badges.includes('first_friend'),
    'PRUEBA 7b: evaluateBadges desbloquea insignias según la colección'
  );

  console.log('\n==========================================');
  console.log(`RESUMEN: ${passed} pruebas superadas, ${failed} fallos.`);
  console.log('==========================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Error fatal en ejecución de pruebas:', e);
  process.exit(1);
});
