import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Supabase Auth UUID (auth.users.id)
  email: text('email').notNull(),
  name: text('name'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Captured pets table (Petdex)
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
  lat: text('lat').notNull(),
  lng: text('lng').notNull(),
  locationName: text('location_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Lost Pets table (Mascotas Perdidas - SOS Peludo)
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
  lastSeenLat: text('last_seen_lat').notNull(),
  lastSeenLng: text('last_seen_lng').notNull(),
  lastSeenAddress: text('last_seen_address').notNull(),
  status: text('status').notNull().default('lost'), // 'lost' | 'found'
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  pets: many(pets),
  lostPets: many(lostPets),
}));

export const petsRelations = relations(pets, ({ one }) => ({
  user: one(users, {
    fields: [pets.userId],
    references: [users.uid],
  }),
}));

export const lostPetsRelations = relations(lostPets, ({ one }) => ({
  user: one(users, {
    fields: [lostPets.userId],
    references: [users.uid],
  }),
}));
