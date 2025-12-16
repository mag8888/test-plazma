import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { getMongoDb } from '../lib/mongo-write.js';
import { ObjectId } from 'mongodb';

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
  // Use native driver to bypass Prisma transaction reqs (P2031)
  const db = await getMongoDb();
  await db.collection('CartItem').updateOne(
    {
      userId: new ObjectId(userId),
      productId: new ObjectId(productId)
    },
    {
      $inc: { quantity: 1 },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
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
