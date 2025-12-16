import { getMongoDb } from '../lib/mongo-write.js';
import { ObjectId } from 'mongodb';
import { Context } from '../bot/context.js';

export async function ensureUser(ctx: Context) {
  try {
    const from = ctx.from;
    if (!from) return null;

    const telegramId = String(from.id);
    const db = await getMongoDb();
    const users = db.collection('User');

    // 1. Try to find existing
    const existingUser = await users.findOne({ telegramId });

    if (existingUser) {
      // Update
      await users.updateOne(
        { _id: new ObjectId(existingUser._id) },
        {
          $set: {
            firstName: from.first_name ?? null,
            lastName: from.last_name ?? null,
            username: from.username ?? null,
            languageCode: from.language_code ?? null,
            updatedAt: new Date()
          }
        }
      );
      // Return full object merged with updates
      return {
        id: existingUser._id.toString(),
        telegramId: existingUser.telegramId,
        firstName: from.first_name ?? null,
        lastName: from.last_name ?? null,
        username: from.username ?? null,
        languageCode: from.language_code ?? null,
      };
    }

    // 2. Create new
    const newUser = {
      telegramId,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      languageCode: from.language_code ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(newUser);

    return {
      id: result.insertedId.toString(),
      ...newUser
    };

  } catch (error) {
    console.error('ERROR in ensureUser (Native):', error);
    return null;
  }
}

export async function logUserAction(ctx: Context, action: string, payload?: any) {
  try {
    const user = await ensureUser(ctx);
    if (!user) return;

    const db = await getMongoDb();
    await db.collection('UserHistory').insertOne({
      userId: new ObjectId(user.id), // Ensure stored as ObjectId for Prisma compatibility
      action,
      payload: payload ?? undefined,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('ERROR in logUserAction (Native):', error);
  }
}
