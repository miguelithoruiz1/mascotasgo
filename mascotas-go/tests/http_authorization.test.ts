/**
 * MASCOTAS GO — Real HTTP Authorization & Privacy Protection Test Suite
 * Tests live HTTP network calls against the Express server instance
 */
process.env.NODE_ENV = 'test';

import { AddressInfo } from 'net';
import { createServerApp } from '../server.ts';
import { getOrCreateUser } from '../src/db/users.ts';
import { insertUserPet, getUserPets } from '../src/db/pets.ts';
import { insertLostPet, getAllLostPets } from '../src/db/lostPets.ts';

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

async function runHttpTests() {
  console.log('\n--- INICIANDO PRUEBAS HTTP REALES DE AUTORIZACIÓN Y PRIVACIDAD ---');

  const app = await createServerApp();
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Servidor de pruebas Express levantado en ${baseUrl}`);

  const testUserA = 'http_user_alpha_' + Date.now();
  const testUserB = 'http_user_beta_' + Date.now();
  const tokenA = `Bearer test_token_${testUserA}`;
  const tokenB = `Bearer test_token_${testUserB}`;

  try {
    // 0. Sembrar usuarios y datos iniciales en base de datos
    await getOrCreateUser(testUserA, `${testUserA}@test.com`, 'Usuario Alpha');
    await getOrCreateUser(testUserB, `${testUserB}@test.com`, 'Usuario Beta');

    const petBId = `pet_http_b_${Date.now()}`;
    await insertUserPet({
      id: petBId,
      userId: testUserB,
      species: 'perro',
      name: 'Firulais Beta',
      breed: 'Poodle',
      color: 'Blanco',
      mood: 'Alegre',
      rarity: 'Raro',
      cuteScore: 88,
      xpReward: 120,
      description: 'Mascota HTTP de prueba',
      funFact: 'Le gusta el parque',
      photoUrl: 'https://example.com/poodle.jpg',
      lat: '4.710989',
      lng: '-74.072092',
      locationName: 'Parque de los Novios',
    });

    const lostPetBId = `lost_http_b_${Date.now()}`;
    const rawPhoneB = '+57 312 987 6543';
    const rawLatB = '4.653421';
    const rawLngB = '-74.083512';

    await insertLostPet({
      id: lostPetBId,
      userId: testUserB,
      petName: 'Pelusa Beta',
      species: 'gato',
      breed: 'Angora',
      color: 'Blanco',
      photoUrl: 'https://example.com/angora.jpg',
      description: 'Se extravió cerca de la panadería',
      contactName: 'Carlos Beta',
      contactPhone: rawPhoneB,
      reward: '$50 USD',
      lastSeenLat: rawLatB,
      lastSeenLng: rawLngB,
      lastSeenAddress: 'Carrera 15 con Calle 85, Edificio Robles Apto 402, Bogotá',
      status: 'lost',
    });

    // ==========================================
    // PRUEBAS DE ENDPOINTS DE MASCOTAS (PETS)
    // ==========================================
    console.log('\n[1/3] Pruebas HTTP de Mascotas (/api/pets):');

    // TEST 1: DELETE sin token
    const resDelNoAuth = await fetch(`${baseUrl}/api/pets/${petBId}`, {
      method: 'DELETE',
    });
    assert(
      resDelNoAuth.status === 401,
      'PRUEBA HTTP 1: DELETE /api/pets/:id sin token retorna 401 Unauthorized'
    );

    // TEST 2: DELETE con token ajeno (Usuario A intentando borrar mascota de Usuario B)
    const resDelCross = await fetch(`${baseUrl}/api/pets/${petBId}`, {
      method: 'DELETE',
      headers: { Authorization: tokenA },
    });
    assert(
      resDelCross.status === 404,
      'PRUEBA HTTP 2: DELETE /api/pets/:id con token de Usuario A sobre mascota de B retorna 404 (No autorizado)'
    );

    // Verificar que la mascota de B sigue intacta
    const petsOfB = await getUserPets(testUserB);
    const petBStillAlive = petsOfB.some((p) => p.id === petBId);
    assert(
      petBStillAlive,
      'PRUEBA HTTP 2b: La mascota del Usuario B permanece intacta tras intento malicioso'
    );

    // TEST 3: POST /api/pets intentando suplantar userId en el cuerpo
    const resPostSpoof = await fetch(`${baseUrl}/api/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: tokenA,
      },
      body: JSON.stringify({
        id: `pet_spoof_${Date.now()}`,
        userId: testUserB, // Intento de inyección maliciosa
        species: 'gato',
        name: 'Gato Suplantador',
        breed: 'Criollo',
        color: 'Negro',
        mood: 'Misterioso',
        rarity: 'Común',
        cuteScore: 75,
        xpReward: 90,
        description: 'Intento de suplantación',
        funFact: 'No funcionará',
        photoUrl: 'https://example.com/cat.jpg',
        lat: '4.700',
        lng: '-74.070',
        locationName: 'Chapinero',
      }),
    });
    const postSpoofData = await resPostSpoof.json();
    assert(
      resPostSpoof.status === 200 && postSpoofData.pet.userId === testUserA,
      'PRUEBA HTTP 3: POST /api/pets ignora userId falsificado en el body y asigna estrictamente el UID del token'
    );

    // TEST 4: DELETE con token legítimo de Usuario B
    const resDelOwner = await fetch(`${baseUrl}/api/pets/${petBId}`, {
      method: 'DELETE',
      headers: { Authorization: tokenB },
    });
    assert(
      resDelOwner.status === 200,
      'PRUEBA HTTP 4: DELETE /api/pets/:id con token legítimo del propietario retorna 200 OK'
    );

    // ==========================================
    // PRUEBAS DE PRIVACIDAD EN REPORTES SOS (/api/lost-pets)
    // ==========================================
    console.log('\n[2/3] Pruebas HTTP de Privacidad SOS (/api/lost-pets):');

    // TEST 5: GET /api/lost-pets sin autenticación (público / anónimo)
    const resPublicLost = await fetch(`${baseUrl}/api/lost-pets`);
    assert(
      resPublicLost.status === 200,
      'PRUEBA HTTP 5a: GET /api/lost-pets público retorna 200 OK para la comunidad'
    );

    const publicLostData = await resPublicLost.json();
    const publicPetB = publicLostData.lostPets.find((p: any) => p.id === lostPetBId);
    assert(
      Boolean(publicPetB),
      'PRUEBA HTTP 5b: El reporte de la mascota perdida es visible en el radar público'
    );

    // Comprobar que el teléfono está enmascarado
    const phoneIsMasked =
      publicPetB.contactPhone.includes('***') &&
      !publicPetB.contactPhone.includes('987 6543');
    assert(
      phoneIsMasked,
      `PRUEBA HTTP 5c: Teléfono protegido ante visitantes anónimos (${publicPetB.contactPhone})`
    );

    // Comprobar que las coordenadas están aproximadas (~110m, máx 3 decimales)
    const latDecimals = (publicPetB.lastSeenLat.split('.')[1] || '').length;
    const lngDecimals = (publicPetB.lastSeenLng.split('.')[1] || '').length;
    assert(
      latDecimals <= 3 && lngDecimals <= 3 && publicPetB.isProtected === true,
      `PRUEBA HTTP 5d: Coordenadas GPS aproximadas a resolución de vecindario (lat: ${publicPetB.lastSeenLat}, lng: ${publicPetB.lastSeenLng})`
    );

    // Comprobar que el UID personal no se filtra a visitantes anónimos
    assert(
      publicPetB.userId === undefined,
      'PRUEBA HTTP 5e: UID del creador omitido estrictamente para visitantes anónimos'
    );

    // Comprobar que los detalles privados del hogar (número de apartamento/interior) están protegidos
    assert(
      !publicPetB.lastSeenAddress.includes('Apto 402') && publicPetB.lastSeenAddress.includes('[Sector protegido]'),
      `PRUEBA HTTP 5f: Dirección particular protegida ante visitantes anónimos (${publicPetB.lastSeenAddress})`
    );

    // Comprobar que el nombre de contacto real no se expone a anónimos
    assert(
      publicPetB.contactName === 'Propietario verificado',
      `PRUEBA HTTP 5g: Nombre de contacto privado protegido ante anónimos (${publicPetB.contactName})`
    );

    // TEST 6: GET /api/lost-pets/:id/contact sin autenticación
    const resContactNoAuth = await fetch(`${baseUrl}/api/lost-pets/${lostPetBId}/contact`);
    assert(
      resContactNoAuth.status === 401,
      'PRUEBA HTTP 6: GET /api/lost-pets/:id/contact sin autenticación retorna 401 Unauthorized'
    );

    // TEST 7: GET /api/lost-pets/:id/contact con usuario autenticado (Usuario A contactando para ayudar)
    const resContactAuth = await fetch(`${baseUrl}/api/lost-pets/${lostPetBId}/contact`, {
      headers: { Authorization: tokenA },
    });
    assert(
      resContactAuth.status === 200,
      'PRUEBA HTTP 7a: GET /api/lost-pets/:id/contact con usuario autenticado retorna 200 OK'
    );
    const contactData = await resContactAuth.json();
    assert(
      contactData.contactPhone === rawPhoneB && contactData.lastSeenLat === rawLatB,
      'PRUEBA HTTP 7b: Usuario autenticado obtiene datos de contacto completos para asistir en el rescate'
    );
    assert(
      contactData.contactName === 'Carlos Beta' && contactData.lastSeenAddress.includes('Apto 402'),
      'PRUEBA HTTP 7c: Usuario autenticado obtiene nombre y dirección completa legítima para asistir en el rescate'
    );

    // TEST 8: GET /api/lost-pets con usuario autenticado
    const resAuthLostList = await fetch(`${baseUrl}/api/lost-pets`, {
      headers: { Authorization: tokenA },
    });
    const authLostListData = await resAuthLostList.json();
    const authPetB = authLostListData.lostPets.find((p: any) => p.id === lostPetBId);
    assert(
      authPetB.isProtected === false && authPetB.contactPhone === rawPhoneB,
      'PRUEBA HTTP 8: Usuarios autenticados de la comunidad obtienen acceso legítimo a números de rescate'
    );

    // ==========================================
    // PRUEBAS DE MODIFICACIÓN DE REPORTES SOS
    // ==========================================
    console.log('\n[3/3] Pruebas HTTP de Modificación SOS (/api/lost-pets/:id/found):');

    // TEST 9: PATCH /api/lost-pets/:id/found sin token
    const resPatchNoAuth = await fetch(`${baseUrl}/api/lost-pets/${lostPetBId}/found`, {
      method: 'PATCH',
    });
    assert(
      resPatchNoAuth.status === 401,
      'PRUEBA HTTP 9: PATCH /api/lost-pets/:id/found sin token retorna 401 Unauthorized'
    );

    // TEST 10: PATCH /api/lost-pets/:id/found con token ajeno (Usuario A intentando cerrar reporte de B)
    const resPatchCross = await fetch(`${baseUrl}/api/lost-pets/${lostPetBId}/found`, {
      method: 'PATCH',
      headers: { Authorization: tokenA },
    });
    assert(
      resPatchCross.status === 404,
      'PRUEBA HTTP 10: PATCH /api/lost-pets/:id/found con token ajeno retorna 404 (No autorizado)'
    );

    // TEST 11: PATCH /api/lost-pets/:id/found con token del propietario legítimo B
    const resPatchOwner = await fetch(`${baseUrl}/api/lost-pets/${lostPetBId}/found`, {
      method: 'PATCH',
      headers: { Authorization: tokenB },
    });
    const patchOwnerData = await resPatchOwner.json();
    assert(
      resPatchOwner.status === 200 && patchOwnerData.lostPet.status === 'found',
      'PRUEBA HTTP 11: PATCH /api/lost-pets/:id/found con propietario legítimo actualiza exitosamente a "found"'
    );

    // TEST 12: POST /api/lost-pets sin token
    const resPostLostNoAuth = await fetch(`${baseUrl}/api/lost-pets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petName: 'Anon Pet', species: 'perro' }),
    });
    assert(
      resPostLostNoAuth.status === 401,
      'PRUEBA HTTP 12: POST /api/lost-pets sin token retorna 401 Unauthorized'
    );

  } catch (error) {
    console.error('Error fatal durante la ejecución de pruebas HTTP:', error);
    failed++;
  } finally {
    server.close();
    console.log('\n==========================================');
    console.log(`RESUMEN HTTP: ${passed} pruebas superadas, ${failed} fallos.`);
    console.log('==========================================');
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runHttpTests();
