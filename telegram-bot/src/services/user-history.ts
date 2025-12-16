import type { Prisma } from '@prisma/client';
import { Context } from '../bot/context.js';
import { prisma } from '../lib/prisma.js';

export async function ensureUser(ctx: Context) {
  try {
    const from = ctx.from;
    if (!from) return null;

    const data = {
      telegramId: String(from.id),
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      languageCode: from.language_code ?? null,
    } as const;

    const existingUser = await prisma.user.findUnique({
      where: { telegramId: data.telegramId },
    });

    if (existingUser) {
      return await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          languageCode: data.languageCode,
        },
      });
    }

    return await prisma.user.create({
      data,
    });
  } catch (error) {
    console.error('ERROR in ensureUser:', error);
    return null;
  }
}

export async function logUserAction(ctx: Context, action: string, payload?: Prisma.JsonValue) {
  try {
    const user = await ensureUser(ctx);
    if (!user) return;

    await prisma.userHistory.create({
      data: {
        userId: user.id,
        action,
        payload: payload ?? undefined,
      },
    });
  } catch (error) {
    console.error('ERROR in logUserAction:', error);
    // Suppress error to avoid breaking main bot flow
  }
}
