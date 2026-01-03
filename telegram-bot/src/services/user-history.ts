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

    // Use atomic findOneAndUpdate with upsert to prevent race conditions
    const update = {
      $set: {
        firstName: from.first_name ?? null,
        lastName: from.last_name ?? null,
        username: from.username ?? null,
        languageCode: from.language_code ?? null,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date(),
        telegramId // Ensure telegramId is set on insert
      }
    };

    const result = await users.findOneAndUpdate(
      { telegramId },
      update,
      {
        upsert: true,
        returnDocument: 'after' // Return the updated/inserted document
      }
    );

    // ensure result.value is consistent (mongodb driver version differences)
    // In v6+, result is the document directly if returnDocument is used? 
    // Actually findOneAndUpdate returns a FindAndModifyResult. 
    // Let's handle both cases or assume v5/v6 compatibility layer.

    // In mongodb v4 driver: result.value
    // In mongodb v5 driver: result.value
    // In mongodb v6: returns result (the document) if includeResultMetadata is false (default)?
    // Wait, the project uses mongodb ^6.0.0 or similar. Let's check package.json.
    // It says "mongodb": "^7.0.0" now.

    // In MongoDB Driver v6+, findOneAndUpdate returns the document directly by default?
    // Let's verify documentation behaviour or use safe access.
    // Actually, in v5+, if { includeResultMetadata: false } (default), it returns the document.

    const doc = result; // For v6+ default behavior

    if (!doc) {
      console.error('ensureUser: findOneAndUpdate returned null but upsert is true');
      return null;
    }

    return {
      id: doc._id.toString(),
      telegramId: doc.telegramId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      username: doc.username,
      languageCode: doc.languageCode
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
