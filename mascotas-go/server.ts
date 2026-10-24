import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { analyzePetImage } from './src/server/geminiPetService.ts';
import './src/server/freeLlmApiProvider.ts';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { getUserPets, insertUserPet, deleteUserPet } from './src/db/pets.ts';
import { getAllLostPets, insertLostPet, markLostPetFound, getLostPetById } from './src/db/lostPets.ts';
import { maskPhoneNumber, approximateCoordinate, maskAddressForPublic } from './src/server/privacyUtils.ts';

const isTestEnv = process.env.NODE_ENV === 'test';
dotenv.config({ override: true });
if (isTestEnv) {
  process.env.NODE_ENV = 'test';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServerApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  // En Vercel (serverless) esta app solo atiende /api/*: los archivos
  // estáticos de `dist` los sirve la plataforma, nunca Express.
  const isServerless = Boolean(process.env.VERCEL);

  // Support large base64 image payloads (up to 25MB)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API route for pet detection (Gemini Vision)
  app.post('/api/identify-pet', async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Missing image parameter' });
      }
      const isLiveScan = Boolean(req.body.isLiveScan);
      const result = await analyzePetImage(image, isLiveScan);
      return res.status(200).json(result);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Server error in /api/identify-pet:', errorMsg);
      return res.status(500).json({ error: errorMsg });
    }
  });

  // User Profile Sync Endpoint (Database)
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const { name, avatar } = req.body;
      const dbUser = await getOrCreateUser(user.uid, user.email || '', name, avatar);
      return res.json({ user: dbUser });
    } catch (error: any) {
      console.error('Error syncing user:', error);
      return res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // User Pets Endpoints (Cloud SQL Database)
  app.get('/api/pets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const petsList = await getUserPets(user.uid);
      return res.json({ pets: petsList });
    } catch (error: any) {
      console.error('Error fetching pets:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch pets' });
    }
  });

  app.post('/api/pets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const pet = req.body;
      // Ensure user exists first
      await getOrCreateUser(user.uid, user.email || '');
      const savedPet = await insertUserPet({
        ...pet,
        userId: user.uid,
      });
      return res.json({ pet: savedPet });
    } catch (error: any) {
      console.error('Error saving pet:', error);
      return res.status(500).json({ error: error.message || 'Failed to save pet' });
    }
  });

  app.delete('/api/pets/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const deleted = await deleteUserPet(req.params.id, user.uid);
      if (!deleted) {
        return res.status(404).json({ error: 'Pet not found or unauthorized' });
      }
      return res.json({ success: true, deletedPet: deleted });
    } catch (error: any) {
      console.error('Error deleting pet:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete pet' });
    }
  });

  // Lost Pets Endpoints (Public SOS Community Radar with Privacy Protection)
  app.get('/api/lost-pets', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const allLost = await getAllLostPets();
      const isAuthenticated = Boolean(req.user);
      const requesterUid = req.user?.uid;

      const sanitized = allLost.map((pet) => {
        const isOwner = Boolean(requesterUid && requesterUid === pet.userId);

        if (!isAuthenticated) {
          // Public anonymous visitor:
          // 1. Mask personal phone number (+57 312 *** 789)
          // 2. Protect owner contact name against web scrapers
          // 3. Approximate GPS coordinates to 3 decimals (~110m resolution), avoiding Null Island
          // 4. Omit owner's personal UID to protect account identity
          // 5. Sanitize address, masking apartment/door numbers
          const approxLat = approximateCoordinate(pet.lastSeenLat);
          const approxLng = approximateCoordinate(pet.lastSeenLng);
          const sanitizedAddress = maskAddressForPublic(pet.lastSeenAddress);

          const { userId: _omittedUid, ...publicFields } = pet;

          return {
            ...publicFields,
            contactName: 'Propietario verificado',
            contactPhone: maskPhoneNumber(pet.contactPhone),
            lastSeenLat: approxLat !== null ? String(approxLat) : '',
            lastSeenLng: approxLng !== null ? String(approxLng) : '',
            lastSeenAddress: sanitizedAddress,
            isProtected: true,
            isOwner: false,
          };
        }

        // Authenticated user (community member or owner)
        return {
          ...pet,
          isProtected: false,
          isOwner,
        };
      });

      return res.json({ lostPets: sanitized });
    } catch (error: any) {
      console.error('Error fetching lost pets:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch lost pets' });
    }
  });

  // Rate limit tracker for SOS contact requests (max 20 pet contact lookups per minute per user)
  const contactRateLimits = new Map<string, { count: number; resetTime: number }>();

  // Dedicated verified contact endpoint (Requires Authentication, Rate Limited & Audit Logged)
  app.get('/api/lost-pets/:id/contact', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const now = Date.now();
      const userLimit = contactRateLimits.get(user.uid) || { count: 0, resetTime: now + 60000 };

      if (now > userLimit.resetTime) {
        userLimit.count = 0;
        userLimit.resetTime = now + 60000;
      }

      userLimit.count++;
      contactRateLimits.set(user.uid, userLimit);

      if (userLimit.count > 20) {
        console.warn(`[RATE LIMIT SOS] User ${user.uid} exceeded contact request limit.`);
        return res.status(429).json({ error: 'Demasiadas solicitudes de contacto. Por favor espera un momento.' });
      }

      const pet = await getLostPetById(req.params.id);
      if (!pet) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Audit Log for security compliance
      console.info(`[AUDIT SOS CONTACT] User ${user.uid} requested contact info for lost pet ${pet.id} (${pet.petName})`);

      return res.json({
        id: pet.id,
        petName: pet.petName,
        contactName: pet.contactName,
        contactPhone: pet.contactPhone,
        lastSeenLat: pet.lastSeenLat,
        lastSeenLng: pet.lastSeenLng,
        lastSeenAddress: pet.lastSeenAddress,
        isOwner: user.uid === pet.userId,
      });
    } catch (error: any) {
      console.error('Error fetching contact for lost pet:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch contact' });
    }
  });

  app.post('/api/lost-pets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const report = req.body;
      await getOrCreateUser(user.uid, user.email || '');
      const id = `lost_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const savedReport = await insertLostPet({
        id,
        userId: user.uid,
        petName: report.petName,
        species: report.species,
        breed: report.breed,
        color: report.color,
        photoUrl: report.photoUrl || null,
        description: report.description,
        contactName: report.contactName,
        contactPhone: report.contactPhone,
        reward: report.reward || null,
        lastSeenLat: String(report.lastSeenLat),
        lastSeenLng: String(report.lastSeenLng),
        lastSeenAddress: report.lastSeenAddress || 'Ubicación señalada en el mapa',
        status: 'lost',
      });
      return res.json({ lostPet: savedReport });
    } catch (error: any) {
      console.error('Error reporting lost pet:', error);
      return res.status(500).json({ error: error.message || 'Failed to report lost pet' });
    }
  });

  app.patch('/api/lost-pets/:id/found', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const updated = await markLostPetFound(req.params.id, user.uid);
      if (!updated) {
        return res.status(404).json({ error: 'Report not found or unauthorized' });
      }
      return res.json({ lostPet: updated });
    } catch (error: any) {
      console.error('Error updating lost pet:', error);
      return res.status(500).json({ error: error.message || 'Failed to update lost pet' });
    }
  });

  if (!isTest && !isServerless) {
    if (!isProd) {
      // Mount Vite dev middleware
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      // Production static serving
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  return app;
}

// Handlers globales para evitar que errores transitorios de base de datos o promesas maten el proceso
process.on('unhandledRejection', (reason, promise) => {
  console.warn('[Process Warning] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Process Warning] Uncaught Exception:', err.message);
});

export async function startServer() {
  const app = await createServerApp();
  // En AI Studio Build, el dev server debe escuchar en el puerto 3000.
  // El puerto 8080 está reservado para el proxy de entrada (nginx) en Cloud Run.
  let port = 3000;
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    port = Number(process.argv[portArgIndex + 1]) || 3000;
  }

  return app.listen(port, '0.0.0.0', () => {
    console.log(`Mascotas Go server listening on port ${port}`);
  });
}

const isDirectExecution = !process.argv[1] || process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js');

if (process.env.NODE_ENV !== 'test' && isDirectExecution) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
