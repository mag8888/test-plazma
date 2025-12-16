import { prisma } from './prisma.js';

export async function ensureInitialData() {
  const reviewCount = await prisma.review.count();
  if (reviewCount === 0) {
    try {
      await prisma.review.create({
        data: {
          name: 'Дмитрий',
          content: 'Будущее наступило ребята\nЭто действительно биохакинг нового поколения. Мне было трудно поверить в такую эффективность. Я забыл что такое усталость!',
          isActive: true,
          isPinned: true,
        },
      });
    } catch (error) {
      console.warn('⚠️ Verification warning: Could not create initial review. This is expected on standalone MongoDB (no replica set). Continuing...', error);
    }
  }
}
