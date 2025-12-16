import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

export async function getCartItems(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addProductToCart(userId: string, productId: string) {
  // Manual upsert replacement for Mongo standalone
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      userId,
      productId,
    },
  });

  if (existingItem) {
    return prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: { increment: 1 } },
    });
  }

  return prisma.cartItem.create({
    data: {
      userId,
      productId,
      quantity: 1,
    },
  });
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

export function cartItemsToText(items: Array<{ product: { title: string; price: number }; quantity: number }>) {
  if (items.length === 0) {
    return 'Корзина пуста.';
  }

  const lines = items.map((item) => {
    const price = Number(item.product.price);
    const total = price * item.quantity;
    return `• ${item.product.title} — ${item.quantity} шт. × ${price.toFixed(2)} = ${total.toFixed(2)} ₽`;
  });

  return lines.join('\n');
}
