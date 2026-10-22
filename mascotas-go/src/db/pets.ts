import { db } from './index.ts';
import { pets } from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';

export async function getUserPets(userUid: string) {
  try {
    return await db.select().from(pets).where(eq(pets.userId, userUid)).orderBy(desc(pets.createdAt));
  } catch (error) {
    console.error('Failed to get user pets from database:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertUserPet(petData: typeof pets.$inferInsert) {
  try {
    const result = await db.insert(pets).values(petData).returning();
    return result[0];
  } catch (error) {
    console.error('Failed to insert user pet into database:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteUserPet(id: string, userUid: string) {
  try {
    const deleted = await db
      .delete(pets)
      .where(and(eq(pets.id, id), eq(pets.userId, userUid)))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Failed to delete pet from database:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
