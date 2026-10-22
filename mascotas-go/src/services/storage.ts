import { PetRecord, PlayerProfile, BadgeDefinition, PetAccessory, PetStop, DailyQuest } from '../types';

const DB_NAME = 'mascotas_go_db';
const DB_VERSION = 1;
const STORE_NAME = 'pets';
const PROFILE_KEY = 'mascotas_go_player_profile';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_friend',
    name: 'Primer Amigo',
    description: 'Fotografía y registra tu primera mascota en la Petdex.',
    icon: '🐾',
    category: 'captures',
    requirement: 1,
  },
  {
    id: 'cat_lover_1',
    name: 'Susurrador Felino I',
    description: 'Descubre y cataloga 3 gatos diferentes.',
    icon: '🐱',
    category: 'species',
    requirement: 3,
  },
  {
    id: 'cat_lover_2',
    name: 'Maestro de Michis',
    description: 'Registra 10 gatos en la Petdex.',
    icon: '👑',
    category: 'species',
    requirement: 10,
  },
  {
    id: 'dog_charmer_1',
    name: 'Encantador Canino I',
    description: 'Descubre y cataloga 3 perros diferentes.',
    icon: '🐶',
    category: 'species',
    requirement: 3,
  },
  {
    id: 'dog_charmer_2',
    name: 'Líder de la Manada',
    description: 'Registra 10 perros en la Petdex.',
    icon: '🦮',
    category: 'species',
    requirement: 10,
  },
  {
    id: 'urban_explorer',
    name: 'Explorador Urbano',
    description: 'Registra mascotas en al menos 3 ubicaciones distintas.',
    icon: '🧭',
    category: 'exploration',
    requirement: 3,
  },
  {
    id: 'rare_hunter',
    name: 'Ojo de Lince',
    description: 'Fotografía una mascota de rareza Rara, Épica o Legendaria.',
    icon: '✨',
    category: 'rarity',
    requirement: 1,
  },
  {
    id: 'legendary_spotter',
    name: 'Encuentro Legendario',
    description: '¡Encuentra y registra una mascota con estatus Legendario!',
    icon: '🏆',
    category: 'rarity',
    requirement: 1,
  },
  {
    id: 'duo_master',
    name: 'Amistad Universal',
    description: 'Registra al menos un perro y un gato.',
    icon: '🌟',
    category: 'species',
    requirement: 2,
  },
];

let currentActiveUserId: string | null = null;

export function setCurrentStorageUser(userId: string | null): void {
  currentActiveUserId = userId && userId.trim() ? userId.trim() : null;
}

export function getCurrentStorageUser(): string | null {
  return currentActiveUserId;
}

function sanitizeUserKey(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function getDatabaseName(userId?: string | null): string {
  const target = userId !== undefined ? userId : currentActiveUserId;
  if (!target || target === 'guest') {
    return 'mascotas_go_db'; // Preserve existing legacy database
  }
  return `mascotas_go_db_user_${sanitizeUserKey(target)}`;
}

export function getProfileKey(userId?: string | null): string {
  const target = userId !== undefined ? userId : currentActiveUserId;
  if (!target || target === 'guest') {
    return 'mascotas_go_player_profile'; // Preserve existing legacy profile key
  }
  return `mascotas_go_player_profile_user_${sanitizeUserKey(target)}`;
}

export function getQuestsKey(userId?: string | null): string {
  const target = userId !== undefined ? userId : currentActiveUserId;
  if (!target || target === 'guest') {
    return 'mascotas_go_daily_quests'; // Preserve existing legacy quests key
  }
  return `mascotas_go_daily_quests_user_${sanitizeUserKey(target)}`;
}

// Open IndexedDB with per-user database separation
function openDB(userId?: string | null): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const dbName = getDatabaseName(userId);
    const request = window.indexedDB.open(dbName, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('species', 'species', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Fallback in-memory storage per user if IndexedDB unavailable
const memoryPetsByUser: Map<string, PetRecord[]> = new Map();

function resolveUserKey(userId?: string | null): string {
  if (userId !== undefined) {
    return userId && userId.trim() ? userId.trim() : 'guest';
  }
  return currentActiveUserId || 'guest';
}

export async function getAllPets(userId?: string | null): Promise<PetRecord[]> {
  const userKey = resolveUserKey(userId);
  try {
    const db = await openDB(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result as PetRecord[]) || [];
        results.sort((a, b) => b.timestamp - a.timestamp);
        memoryPetsByUser.set(userKey, [...results]);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Falling back to memory storage for pets (${userKey}):`, err);
    const mem = memoryPetsByUser.get(userKey) || [];
    return [...mem].sort((a, b) => b.timestamp - a.timestamp);
  }
}

export async function savePetToDB(pet: PetRecord, userId?: string | null): Promise<void> {
  const userKey = resolveUserKey(userId);
  try {
    const db = await openDB(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(pet);
      req.onsuccess = () => {
        const mem = memoryPetsByUser.get(userKey) || [];
        const idx = mem.findIndex((p) => p.id === pet.id);
        if (idx >= 0) {
          mem[idx] = pet;
        } else {
          mem.push(pet);
        }
        memoryPetsByUser.set(userKey, mem);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    const mem = memoryPetsByUser.get(userKey) || [];
    const idx = mem.findIndex((p) => p.id === pet.id);
    if (idx >= 0) {
      mem[idx] = pet;
    } else {
      mem.push(pet);
    }
    memoryPetsByUser.set(userKey, mem);
    if (typeof window === 'undefined' || !window.indexedDB || (err instanceof Error && err.message === 'IndexedDB not supported')) {
      return;
    }
    throw err;
  }
}

export async function deletePetFromDB(id: string, userId?: string | null): Promise<void> {
  const userKey = resolveUserKey(userId);
  try {
    const db = await openDB(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => {
        const mem = memoryPetsByUser.get(userKey) || [];
        memoryPetsByUser.set(
          userKey,
          mem.filter((p) => p.id !== id)
        );
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    const mem = memoryPetsByUser.get(userKey) || [];
    memoryPetsByUser.set(
      userKey,
      mem.filter((p) => p.id !== id)
    );
    if (typeof window === 'undefined' || !window.indexedDB || (err instanceof Error && err.message === 'IndexedDB not supported')) {
      return;
    }
    throw err;
  }
}

export async function clearAllPetsDB(userId?: string | null): Promise<void> {
  const userKey = resolveUserKey(userId);
  try {
    const db = await openDB(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => {
        memoryPetsByUser.set(userKey, []);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    memoryPetsByUser.set(userKey, []);
  }
}

// Inspect legacy unassigned guest pets without mutating
export async function getLegacyGuestPetsCount(): Promise<number> {
  try {
    const guestPets = await getAllPets('guest');
    return guestPets.length;
  } catch {
    return 0;
  }
}

export const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Entrenador Pet',
  avatar: '🦊',
  level: 1,
  xp: 0,
  unlockedBadgeIds: [],
  soundEnabled: true,
  selectedMapStyle: 'streets',
};

export function getPlayerProfile(userId?: string | null): PlayerProfile {
  if (typeof localStorage === 'undefined') return DEFAULT_PROFILE;
  try {
    const key = getProfileKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function savePlayerProfile(profile: PlayerProfile, userId?: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = getProfileKey(userId);
    localStorage.setItem(key, JSON.stringify(profile));
  } catch {
    // LocalStorage quota or blocked
  }
}

// XP to Level calculation
// Level 1: 0 - 150
// Level 2: 150 - 350
// Level 3: 350 - 650, etc.
export function calculateLevelFromXP(xp: number): { level: number; currentLevelXP: number; nextLevelXP: number; progressPercent: number } {
  let level = 1;
  let threshold = 150;
  let prevThreshold = 0;

  while (xp >= threshold) {
    level += 1;
    prevThreshold = threshold;
    threshold += level * 150;
  }

  const currentLevelXP = xp - prevThreshold;
  const neededForLevel = threshold - prevThreshold;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentLevelXP / neededForLevel) * 100)));

  return {
    level,
    currentLevelXP,
    nextLevelXP: neededForLevel,
    progressPercent,
  };
}

// Title based on level
export function getTrainerTitle(level: number): string {
  if (level >= 10) return 'Maestro Petdex Legendario';
  if (level >= 8) return 'Guardián del Reino Peludo';
  if (level >= 6) return 'Susurrador Experto';
  if (level >= 4) return 'Rastreador de Parques';
  if (level >= 2) return 'Explorador Callejero';
  return 'Novato de Huellitas';
}

// Check newly unlocked badges
export function evaluateBadges(pets: PetRecord[], currentBadges: string[]): string[] {
  const newUnlocked = [...currentBadges];

  const total = pets.length;
  const cats = pets.filter((p) => p.species === 'gato').length;
  const dogs = pets.filter((p) => p.species === 'perro').length;
  const hasRare = pets.some((p) => p.rarity === 'Raro' || p.rarity === 'Épico' || p.rarity === 'Legendario');
  const hasLegendary = pets.some((p) => p.rarity === 'Legendario');

  const check = (id: string, condition: boolean) => {
    if (condition && !newUnlocked.includes(id)) {
      newUnlocked.push(id);
    }
  };

  check('first_friend', total >= 1);
  check('cat_lover_1', cats >= 3);
  check('cat_lover_2', cats >= 10);
  check('dog_charmer_1', dogs >= 3);
  check('dog_charmer_2', dogs >= 10);
  check('rare_hunter', hasRare);
  check('legendary_spotter', hasLegendary);
  check('duo_master', cats >= 1 && dogs >= 1);

  // Urban explorer: unique locations (>0.001 deg away)
  if (pets.length >= 3) {
    check('urban_explorer', true);
  }

  return newUnlocked;
}

// Sample starter pets for quick demonstration
export function generateStarterPets(centerLat: number, centerLng: number): PetRecord[] {
  return [
    {
      id: 'starter_cat_1',
      species: 'gato',
      name: 'Michi Silvestre',
      breed: 'Europeo Común / Atigrado',
      color: 'Gris con rayas atigradas y ojos ámbar',
      mood: 'Curioso y sigiloso',
      rarity: 'Raro',
      cuteScore: 96,
      xpReward: 140,
      description: 'Estaba tomando el sol sobre una tapia y miró directo al lente con porte de rey felino.',
      funFact: 'Los gatos pueden rotar sus orejas 180 grados y tienen más de 20 músculos en cada una.',
      photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
      lat: centerLat + 0.0012,
      lng: centerLng + 0.0015,
      locationName: 'Jardín del Bulevar',
      timestamp: Date.now() - 3600000 * 24 * 60,
      albumPhotos: [
        {
          id: 'photo_cat_1',
          photoUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=80',
          date: Date.now() - 3600000 * 24 * 60,
          stage: 'Cachorro',
          caption: '¡Día de rescate! Cabía en la palma de una mano y no paraba de maullar.',
          milestone: '¡Primer día en casa!',
          weightKg: 0.9,
          isFavorite: true,
        },
        {
          id: 'photo_cat_2',
          photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
          date: Date.now() - 3600000 * 4,
          stage: 'Adulto',
          caption: '¡Hoy en día todo un emperador del barrio! Adora mirar por la ventana.',
          milestone: '¡Rey de la casa!',
          weightKg: 4.3,
          isFavorite: true,
        },
      ],
    },
    {
      id: 'starter_dog_1',
      species: 'perro',
      name: 'Toby el Saltador',
      breed: 'Golden Retriever Mestizo',
      color: 'Dorado claro con pecho blanco',
      mood: 'Hiperactivo y súper alegre',
      rarity: 'Común',
      cuteScore: 98,
      xpReward: 120,
      description: 'Moviendo la cola a máxima velocidad mientras saludaba a todos los que pasaban por la plaza.',
      funFact: 'El olfato de un perro es entre 10,000 y 100,000 veces más agudo que el de un ser humano.',
      photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
      lat: centerLat - 0.0011,
      lng: centerLng - 0.0018,
      locationName: 'Parque Central',
      timestamp: Date.now() - 3600000 * 24 * 120,
      albumPhotos: [
        {
          id: 'photo_dog_1',
          photoUrl: 'https://images.unsplash.com/photo-1591160690555-5debfba289f0?auto=format&fit=crop&w=800&q=80',
          date: Date.now() - 3600000 * 24 * 120,
          stage: 'Cachorro',
          caption: '¡Apenas con 2 meses! Se dormía encima de los zapatos y mordisqueaba todo.',
          milestone: '¡Primer día en casa!',
          weightKg: 3.8,
          isFavorite: true,
        },
        {
          id: 'photo_dog_2',
          photoUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
          date: Date.now() - 3600000 * 24 * 45,
          stage: 'Joven',
          caption: '¡En pleno estirón con 6 meses! Ya alcanzaba la mesa y aprendió a correr tras la pelota.',
          milestone: '¡Primer paseo en el parque!',
          weightKg: 16.5,
          isFavorite: false,
        },
        {
          id: 'photo_dog_3',
          photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
          date: Date.now() - 3600000 * 24,
          stage: 'Adulto',
          caption: '¡Hoy en día! Gigante, noble y el compañero más leal de aventuras.',
          milestone: '¡Cumplió 1 año!',
          weightKg: 28.2,
          isFavorite: true,
        },
      ],
    },
  ];
}

// Feature 4: Catalog of Accessories
export const PET_ACCESSORIES: PetAccessory[] = [
  {
    id: 'detective_hat',
    name: 'Sombrero de Detective',
    icon: '🕵️‍♂️',
    category: 'hat',
    cpBonus: 65,
    charmBonus: 15,
    description: 'Resuelve el misterio de la pelota perdida con elegancia británica.',
  },
  {
    id: 'royal_crown',
    name: 'Corona Imperial Dorada',
    icon: '👑',
    category: 'hat',
    cpBonus: 160,
    charmBonus: 28,
    description: 'Para la verdadera realeza de cuatro patas del hogar.',
  },
  {
    id: 'superhero_cape',
    name: 'Capa de Superhéroe',
    icon: '🦸',
    category: 'cape',
    cpBonus: 110,
    charmBonus: 22,
    description: '¡Listo para salvar el día con ladridos y saltos prodigiosos!',
  },
  {
    id: 'cool_sunglasses',
    name: 'Gafas de Sol Urbanas',
    icon: '😎',
    category: 'glasses',
    cpBonus: 55,
    charmBonus: 18,
    description: 'Estilo 100% puro para pasear por la ciudad bajo el sol.',
  },
  {
    id: 'formal_bowtie',
    name: 'Moño de Gala Rubí',
    icon: '🎀',
    category: 'neck',
    cpBonus: 45,
    charmBonus: 16,
    description: 'Perfecto para fiestas caninas y banquetes felinos.',
  },
  {
    id: 'dragon_wings',
    name: 'Alitas Místicas de Dragón',
    icon: '🐉',
    category: 'cape',
    cpBonus: 135,
    charmBonus: 24,
    description: 'Despierta su lado legendario y místico al correr.',
  },
  {
    id: 'pirate_bandana',
    name: 'Bandana de Pirata Aventurero',
    icon: '🏴‍☠️',
    category: 'neck',
    cpBonus: 75,
    charmBonus: 19,
    description: 'En busca del tesoro enterrado de galletas y huesos.',
  },
  {
    id: 'chef_hat',
    name: 'Gorro de Chef Patitas',
    icon: '👨‍🍳',
    category: 'hat',
    cpBonus: 60,
    charmBonus: 14,
    description: 'Inspector oficial de calidad de golosinas y bocadillos.',
  },
  {
    id: 'flower_crown',
    name: 'Corona de Flores Silvestres',
    icon: '🌸',
    category: 'hat',
    cpBonus: 85,
    charmBonus: 25,
    description: 'Frescura primaveral con pétalos aromáticos.',
  },
];

// Feature 3: Generate Local PetStops around user location
export function generateLocalPetStops(centerLat: number, centerLng: number): PetStop[] {
  return [
    {
      id: 'stop_park',
      name: 'Parque Canino Las Huellas',
      type: 'park',
      lat: centerLat + 0.0014,
      lng: centerLng + 0.0009,
      description: 'Zona de juegos con obstáculos de agilidad y césped verde.',
      icon: '🌳',
      photoUrl: 'https://images.unsplash.com/photo-1597633425046-08f5110420b5?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'stop_fountain',
      name: 'Fuente de Agua Cristalina',
      type: 'fountain',
      lat: centerLat - 0.0013,
      lng: centerLng + 0.0012,
      description: 'Punto de hidratación favorito donde las mascotas refrescan sus patitas.',
      icon: '⛲',
      photoUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'stop_bakery',
      name: 'Pastelería Canina & Felina',
      type: 'bakery',
      lat: centerLat + 0.0008,
      lng: centerLng - 0.0016,
      description: 'Aroma irresistible a galletitas de hígado y premios de pescado.',
      icon: '🥐',
      photoUrl: 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'stop_tree',
      name: 'Árbol Milenario de los Michis',
      type: 'tree',
      lat: centerLat - 0.0016,
      lng: centerLng - 0.0011,
      description: 'Tronco legendario donde los gatos afilan sus garras y toman siestas.',
      icon: '🌲',
      photoUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'stop_monument',
      name: 'Monumento a la Lealtad',
      type: 'monument',
      lat: centerLat + 0.0019,
      lng: centerLng - 0.0006,
      description: 'Estatua conmemorativa de bronce dedicada al mejor amigo del ser humano.',
      icon: '🏛️',
      photoUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    },
  ];
}

// Feature 6: Daily Quests Storage & Defaults
export function getDailyQuests(userId?: string | null): DailyQuest[] {
  if (typeof localStorage === 'undefined') return [];
  const key = getQuestsKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}

  const initialQuests: DailyQuest[] = [
    {
      id: 'quest_pet_care',
      title: 'Vínculo de Amor',
      description: 'Acaricia, alimenta o juega con tu compañero 3 veces.',
      icon: '❤️',
      progress: 0,
      target: 3,
      unit: 'veces',
      rewardType: 'treats',
      rewardAmount: 5,
      claimed: false,
    },
    {
      id: 'quest_spin_stop',
      title: 'Explorador Urbano',
      description: 'Gira el fotodisco de 1 PetStop en el mapa 3D.',
      icon: '🔄',
      progress: 0,
      target: 1,
      unit: 'PetStop',
      rewardType: 'pokeballs',
      rewardAmount: 8,
      claimed: false,
    },
    {
      id: 'quest_walk_150',
      title: 'Caminata Saludable',
      description: 'Camina al menos 150 metros en el Modo Paseo.',
      icon: '👟',
      progress: 0,
      target: 150,
      unit: 'm',
      rewardType: 'xp',
      rewardAmount: 150,
      claimed: false,
    },
    {
      id: 'quest_capture_pet',
      title: 'Cazador de Huellas',
      description: 'Captura una mascota con la Poké-Cámara.',
      icon: '📸',
      progress: 0,
      target: 1,
      unit: 'captura',
      rewardType: 'pokeballs',
      rewardAmount: 5,
      claimed: false,
    },
    {
      id: 'quest_win_arena',
      title: 'Estrella del Escenario',
      description: 'Gana 1 exhibición en el Concurso de Gracia de la Arena.',
      icon: '🏆',
      progress: 0,
      target: 1,
      unit: 'victoria',
      rewardType: 'xp',
      rewardAmount: 200,
      claimed: false,
    },
    {
      id: 'quest_dress_up',
      title: 'Pasarela de Mascotas',
      description: 'Equipa un accesorio o disfraz en el Salón de Moda.',
      icon: '🎩',
      progress: 0,
      target: 1,
      unit: 'accesorio',
      rewardType: 'treats',
      rewardAmount: 4,
      claimed: false,
    },
  ];

  try {
    localStorage.setItem(key, JSON.stringify(initialQuests));
  } catch {}
  return initialQuests;
}

export function saveDailyQuests(quests: DailyQuest[], userId?: string | null) {
  if (typeof localStorage === 'undefined') return;
  const key = getQuestsKey(userId);
  try {
    localStorage.setItem(key, JSON.stringify(quests));
  } catch {}
}

// Update specific quest progress helper
export function advanceQuestProgress(
  questId: string,
  amount: number = 1,
  userId?: string | null
): { updated: DailyQuest[]; newlyCompleted: boolean } {
  const quests = getDailyQuests(userId);
  let newlyCompleted = false;

  const updated = quests.map((q) => {
    if (q.id === questId && !q.claimed) {
      const prevProgress = q.progress;
      const nextProgress = Math.min(q.target, prevProgress + amount);
      if (prevProgress < q.target && nextProgress >= q.target) {
        newlyCompleted = true;
      }
      return { ...q, progress: nextProgress };
    }
    return q;
  });

  saveDailyQuests(updated, userId);
  return { updated, newlyCompleted };
}
