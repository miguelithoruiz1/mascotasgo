export type PetSpecies = 'perro' | 'gato';

export type PetRarity = 'Común' | 'Raro' | 'Épico' | 'Legendario';

export interface PetAccessory {
  id: string;
  name: string;
  icon: string;
  category: 'hat' | 'cape' | 'glasses' | 'neck' | 'special';
  cpBonus: number;
  charmBonus: number;
  description: string;
}

export interface PetRecord {
  id: string;
  species: PetSpecies;
  name: string;
  breed: string;
  color: string;
  mood: string;
  rarity: PetRarity;
  cuteScore: number;
  xpReward: number;
  description: string;
  funFact: string;
  photoUrl: string;
  lat: number;
  lng: number;
  locationName?: string;
  timestamp: number;
  // Feature 1: Pet Care & Buddy
  buddyFriendship?: number; // 0 to 100
  hunger?: number;          // 0 to 100 (100 = full)
  energy?: number;          // 0 to 100
  happiness?: number;       // 0 to 100
  lastFedTimestamp?: number;
  // Feature 2: Battle & Moves
  cp?: number;              // Combat Power
  moves?: string[];
  arenaWins?: number;
  // Feature 4: Costumes & Accessories
  equippedAccessoryId?: string;
  // Feature 5: TCG Card
  tcgElement?: 'Normal' | 'Hada' | 'Eléctrico' | 'Místico' | 'Fuego' | 'Planta';
  // Feature 6: Real-Life Growth Photo Album
  albumPhotos?: PetAlbumPhoto[];
}

export type GrowthStage = 'Cachorro' | 'Joven' | 'Adulto' | 'Senior' | 'Especial';

export interface PetAlbumPhoto {
  id: string;
  photoUrl: string;
  date: number; // timestamp
  stage: GrowthStage;
  caption: string;
  weightKg?: number; // e.g. 3.2 kg
  milestone?: string; // e.g. "¡Primer día juntos!", "¡Aprendió a dar la pata!"
  isFavorite?: boolean;
}

export interface LostPetRecord {
  id: string;
  userId: string;
  petName: string;
  species: PetSpecies;
  breed: string;
  color: string;
  photoUrl?: string | null;
  description: string;
  contactName: string;
  contactPhone: string;
  reward?: string | null;
  lastSeenLat: number;
  lastSeenLng: number;
  lastSeenAddress: string;
  status: 'lost' | 'found';
  createdAt?: string | Date;
  hasContactPhone?: boolean;
  isOwner?: boolean;
  isProtected?: boolean;
}

export interface PlayerProfile {
  name: string;
  avatar: string;
  level: number;
  xp: number;
  unlockedBadgeIds: string[];
  soundEnabled: boolean;
  selectedMapStyle: 'streets' | 'satellite' | 'hybrid';
  // Buddy Pet ID
  activeBuddyPetId?: string;
  // Inventory
  pokeBalls?: number;
  superBalls?: number;
  ultraBalls?: number;
  treats?: number;
  // Walk & Fitness
  totalWalkedMeters?: number;
  totalSteps?: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'captures' | 'species' | 'exploration' | 'rarity';
  requirement: number;
}

export interface IdentificationResult {
  has_pet: boolean;
  species?: PetSpecies | 'otro';
  name_suggestion?: string;
  breed?: string;
  color?: string;
  mood?: string;
  rarity?: PetRarity;
  cute_score?: number;
  xp_reward?: number;
  description?: string;
  fun_fact?: string;
  rejection_reason?: string | null;
}

export interface WildPetHint {
  id: string;
  species: PetSpecies;
  hintName: string;
  distanceMeters: number;
  direction: string;
  lat: number;
  lng: number;
  rarity: PetRarity;
}

// Feature 3: PetStops & Eggs
export interface PetStop {
  id: string;
  name: string;
  type: 'park' | 'fountain' | 'tree' | 'bakery' | 'monument';
  lat: number;
  lng: number;
  description: string;
  icon: string;
  photoUrl: string;
  lastSpunTimestamp?: number;
}

export interface PetEgg {
  id: string;
  type: '200m' | '500m' | '1km';
  requiredMeters: number;
  walkedMeters: number;
  hatched: boolean;
  hatchName?: string;
  hatchSpecies?: PetSpecies;
  hatchRarity?: PetRarity;
}

// Feature 6: Daily Quests
export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unit: string;
  rewardType: 'xp' | 'pokeballs' | 'treats' | 'egg';
  rewardAmount: number;
  claimed: boolean;
}
