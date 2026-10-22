import { db } from './index.ts';
import { lostPets } from './schema.ts';
import { desc, eq, and } from 'drizzle-orm';

export async function getAllLostPets() {
  try {
    return await db.select().from(lostPets).orderBy(desc(lostPets.createdAt));
  } catch (error) {
    console.error('Failed to get lost pets from database:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertLostPet(data: typeof lostPets.$inferInsert) {
  try {
    const result = await db.insert(lostPets).values(data).returning();
    return result[0];
  } catch (error) {
    console.error('Failed to insert lost pet into database:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function markLostPetFound(id: string, userUid: string) {
  try {
    const result = await db
      .update(lostPets)
      .set({ status: 'found' })
      .where(and(eq(lostPets.id, id), eq(lostPets.userId, userUid)))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error('Failed to update lost pet status:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getLostPetById(id: string) {
  try {
    const result = await db.select().from(lostPets).where(eq(lostPets.id, id));
    return result[0] || null;
  } catch (error) {
    console.error('Failed to get lost pet by id:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

