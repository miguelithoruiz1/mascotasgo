import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. Users Table (Core Auth & Player Profile)
// ==========================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  avatar: text('avatar'),
  // Additive fields for Player Profile & Active Buddy
  activeBuddyPetId: text('active_buddy_pet_id'),
  xp: integer('xp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==========================================
// 2. Captured Pets Table (Petdex Collection)
// ==========================================
export const pets = pgTable('pets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid),
  species: text('species').notNull(), // 'perro' | 'gato'
  name: text('name').notNull(),
  breed: text('breed').notNull(),
  color: text('color').notNull(),
  mood: text('mood').notNull(),
  rarity: text('rarity').notNull(),
  cuteScore: integer('cute_score').notNull(),
  xpReward: integer('xp_reward').notNull(),
  description: text('description').notNull(),
  funFact: text('fun_fact').notNull(),
  photoUrl: text('photo_url').notNull(),
  // Historical text coordinates preserved intact
  lat: text('lat').notNull(),
  lng: text('lng').notNull(),
  locationName: text('location_name'),
  // Additive columns for numeric coordinates and soft delete
  latNumeric: numeric('lat_numeric', { precision: 10, scale: 7 }),
  lngNumeric: numeric('lng_numeric', { precision: 10, scale: 7 }),
  geoStatus: text('geo_status').default('pending').notNull(), // 'pending' | 'valid' | 'suspicious_zero' | 'quarantined'
  isDeleted: boolean('is_deleted').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==========================================
// 3. Lost Pets Table (SOS Peludo Radar)
// ==========================================
export const lostPets = pgTable('lost_pets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid),
  petName: text('pet_name').notNull(),
  species: text('species').notNull(), // 'perro' | 'gato'
  breed: text('breed').notNull(),
  color: text('color').notNull(),
  photoUrl: text('photo_url'),
  description: text('description').notNull(),
  contactName: text('contact_name').notNull(),
  contactPhone: text('contact_phone').notNull(),
  reward: text('reward'),
  // Historical text coordinates preserved intact
  lastSeenLat: text('last_seen_lat').notNull(),
  lastSeenLng: text('last_seen_lng').notNull(),
  lastSeenAddress: text('last_seen_address').notNull(),
  status: text('status').notNull().default('lost'), // 'lost' | 'found'
  // Additive columns for privacy, numeric coordinates and contact preference
  latNumeric: numeric('lat_numeric', { precision: 10, scale: 7 }),
  lngNumeric: numeric('lng_numeric', { precision: 10, scale: 7 }),
  geoStatus: text('geo_status').default('pending').notNull(),
  contactMethod: text('contact_method').default('phone').notNull(), // 'phone' | 'relay_email'
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==========================================
// 4. Pet Growth Album Photos Table
// ==========================================
export const petAlbumPhotos = pgTable('pet_album_photos', {
  id: text('id').primaryKey(),
  petId: text('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.uid),
  photoUrl: text('photo_url').notNull(),
  date: timestamp('date').notNull(),
  stage: text('stage').notNull(), // 'Cachorro' | 'Joven' | 'Adulto' | 'Senior' | 'Especial'
  caption: text('caption'),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  milestone: text('milestone'),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 5. Reward Events Table (Idempotent Rewards)
// ==========================================
export const rewardEvents = pgTable('reward_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid),
  actionType: text('action_type').notNull(), // 'capture' | 'quest' | 'petstop' | 'badge'
  idempotencyKey: text('idempotency_key').notNull().unique(),
  xpAwarded: integer('xp_awarded').default(0).notNull(),
  itemsAwarded: jsonb('items_awarded'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 6. PetStop Cooldowns Table (Atomic Spin Limits)
// ==========================================
export const petstopCooldowns = pgTable(
  'petstop_cooldowns',
  {
    userId: text('user_id').notNull().references(() => users.uid),
    petstopId: text('petstop_id').notNull(),
    lastSpunAt: timestamp('last_spun_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.petstopId] }),
  ]
);

// ==========================================
// 7. Daily Quests Progress Table
// ==========================================
export const dailyQuestsProgress = pgTable(
  'daily_quests_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.uid),
    questId: text('quest_id').notNull(),
    logicalDate: text('logical_date').notNull(), // Format 'YYYY-MM-DD'
    currentProgress: integer('current_progress').default(0).notNull(),
    targetProgress: integer('target_progress').notNull(),
    claimed: boolean('claimed').default(false).notNull(),
    claimedAt: timestamp('claimed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_user_quest_date').on(table.userId, table.questId, table.logicalDate),
  ]
);

// ==========================================
// 8. User Inventory Table (Items & Consumables)
// ==========================================
export const userInventory = pgTable(
  'user_inventory',
  {
    userId: text('user_id').notNull().references(() => users.uid),
    itemId: text('item_id').notNull(),
    quantity: integer('quantity').default(0).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemId] }),
  ]
);

// ==========================================
// 9. SOS Contact Audit Table (Privacy Log)
// ==========================================
export const sosContactAudit = pgTable('sos_contact_audit', {
  id: serial('id').primaryKey(),
  reportId: text('report_id').notNull().references(() => lostPets.id),
  viewerUid: text('viewer_uid').notNull().references(() => users.uid),
  accessedAt: timestamp('accessed_at').defaultNow().notNull(),
});

// ==========================================
// 10. Migration Geo Quarantine Table
// ==========================================
export const migrationGeoQuarantine = pgTable('migration_geo_quarantine', {
  id: serial('id').primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  rawLat: text('raw_lat'),
  rawLng: text('raw_lng'),
  failureReason: text('failure_reason').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// Relations
// ==========================================
export const usersRelations = relations(users, ({ many, one }) => ({
  pets: many(pets),
  lostPets: many(lostPets),
  activeBuddy: one(pets, {
    fields: [users.activeBuddyPetId],
    references: [pets.id],
  }),
  albumPhotos: many(petAlbumPhotos),
  rewardEvents: many(rewardEvents),
  questsProgress: many(dailyQuestsProgress),
  inventory: many(userInventory),
  cooldowns: many(petstopCooldowns),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
  user: one(users, {
    fields: [pets.userId],
    references: [users.uid],
  }),
  albumPhotos: many(petAlbumPhotos),
}));

export const lostPetsRelations = relations(lostPets, ({ one, many }) => ({
  user: one(users, {
    fields: [lostPets.userId],
    references: [users.uid],
  }),
  contactAudits: many(sosContactAudit),
}));

export const petAlbumPhotosRelations = relations(petAlbumPhotos, ({ one }) => ({
  pet: one(pets, {
    fields: [petAlbumPhotos.petId],
    references: [pets.id],
  }),
  user: one(users, {
    fields: [petAlbumPhotos.userId],
    references: [users.uid],
  }),
}));

export const rewardEventsRelations = relations(rewardEvents, ({ one }) => ({
  user: one(users, {
    fields: [rewardEvents.userId],
    references: [users.uid],
  }),
}));

export const dailyQuestsProgressRelations = relations(dailyQuestsProgress, ({ one }) => ({
  user: one(users, {
    fields: [dailyQuestsProgress.userId],
    references: [users.uid],
  }),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
  user: one(users, {
    fields: [userInventory.userId],
    references: [users.uid],
  }),
}));

export const sosContactAuditRelations = relations(sosContactAudit, ({ one }) => ({
  lostPet: one(lostPets, {
    fields: [sosContactAudit.reportId],
    references: [lostPets.id],
  }),
  viewer: one(users, {
    fields: [sosContactAudit.viewerUid],
    references: [users.uid],
  }),
}));
