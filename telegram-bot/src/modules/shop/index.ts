import { Markup, Telegraf } from 'telegraf';
import { Context } from '../../bot/context.js';
import { BotModule } from '../../bot/types.js';
import { ensureUser, logUserAction } from '../../services/user-history.js';
import { getActiveCategories, getCategoryById, getProductById, getProductsByCategory } from '../../services/shop-service.js';
import { addProductToCart, cartItemsToText, getCartItems } from '../../services/cart-service.js';
import { createOrderRequest } from '../../services/order-service.js';
import { env } from '../../config/env.js';

const CATEGORY_ACTION_PREFIX = 'shop:cat:';
const PRODUCT_MORE_PREFIX = 'shop:prod:more:';
const PRODUCT_CART_PREFIX = 'shop:prod:cart:';
const PRODUCT_BUY_PREFIX = 'shop:prod:buy:';

async function showCategories(ctx: Context) {
  await logUserAction(ctx, 'shop:open');
  const categories = await getActiveCategories();
  if (categories.length === 0) {
    await ctx.reply('Каталог пока пуст. Добавьте категории и товары в админке.');
    return;
  }

  const buttons = categories.map((category) => [
    Markup.button.callback(category.name, `${CATEGORY_ACTION_PREFIX}${category.id}`),
  ]);

  await ctx.reply('Выберите категорию:', Markup.inlineKeyboard(buttons));
}

function formatProductMessage(product: { title: string; summary: string; price: unknown }) {
  const price = Number(product.price);
  return `💧 ${product.title}\n${product.summary}\n\nЦена: ${price.toFixed(2)} ₽`;
}

async function sendProductCards(ctx: Context, categoryId: string) {
  const category = await getCategoryById(categoryId);
  if (!category) {
    await ctx.reply('Категория не найдена.');
    return;
  }

  const products = await getProductsByCategory(categoryId);
  if (products.length === 0) {
    await ctx.reply('В этой категории пока нет товаров.');
    return;
  }

  await ctx.reply(`Категория: ${category.name}`);

  for (const product of products) {
    const buttons = [];
    if (product.description) {
      buttons.push(Markup.button.callback('Подробнее', `${PRODUCT_MORE_PREFIX}${product.id}`));
    }
    buttons.push(Markup.button.callback('В корзину', `${PRODUCT_CART_PREFIX}${product.id}`));
    buttons.push(Markup.button.callback('Купить', `${PRODUCT_BUY_PREFIX}${product.id}`));

    await ctx.reply(formatProductMessage(product), Markup.inlineKeyboard([buttons]));
  }
}

async function handleAddToCart(ctx: Context, productId: string) {
  const user = await ensureUser(ctx);
  if (!user) {
    await ctx.reply('Не удалось определить пользователя. Попробуйте позже.');
    return;
  }

  const product = await getProductById(productId);
  if (!product) {
    await ctx.reply('Товар не найден.');
    return;
  }

  await addProductToCart(user.id, product.id);
  await logUserAction(ctx, 'shop:add-to-cart', { productId: product.id });
  await ctx.answerCbQuery('Добавлено в корзину ✅');
  await ctx.reply(`«${product.title}» добавлен(а) в корзину.`);
}

async function handleProductMore(ctx: Context, productId: string) {
  const product = await getProductById(productId);
  if (!product || !product.description) {
    await ctx.answerCbQuery('Описание не найдено');
    return;
  }

  await logUserAction(ctx, 'shop:product-details', { productId });
  await ctx.answerCbQuery();
  await ctx.reply(`ℹ️ ${product.title}\n\n${product.description}`);
}

async function handleBuy(ctx: Context, productId: string) {
  const user = await ensureUser(ctx);
  if (!user) {
    await ctx.reply('Не удалось определить пользователя. Попробуйте позже.');
    return;
  }

  const product = await getProductById(productId);
  if (!product) {
    await ctx.reply('Товар не найден.');
    return;
  }

  const cartItems = await getCartItems(user.id);
  const summaryText = cartItemsToText(cartItems);
  const adminChatId = env.adminChatId;

  const lines = [
    '🛒 Запрос на покупку',
    `Пользователь: ${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    user.username ? `@${user.username}` : undefined,
    `Telegram ID: ${user.telegramId}`,
    '',
    `Основной товар: ${product.title}`,
  ].filter(Boolean);

  if (cartItems.length > 0) {
    lines.push('', 'Корзина:', summaryText);
  } else {
    lines.push('', 'Корзина: пока пусто.');
  }

  const message = lines.join('\n');

  const itemsPayload = cartItems.map((item) => ({
    productId: item.productId,
    title: item.product.title,
    price: Number(item.product.price),
    quantity: item.quantity,
  }));

  itemsPayload.push({
    productId: product.id,
    title: product.title,
    price: Number(product.price),
    quantity: 1,
  });

  await createOrderRequest({
    userId: user.id,
    message: `Покупка через бота. Основной товар: ${product.title}`,
    items: itemsPayload,
  });

  await logUserAction(ctx, 'shop:buy', { productId });

  if (adminChatId) {
    await ctx.telegram.sendMessage(adminChatId, `${message}\n\nЗдравствуйте, хочу приобрести товар…`);
  }

  await ctx.answerCbQuery();
  await ctx.reply('Заявка отправлена администратору. Мы свяжемся с вами в ближайшее время!');
}

export const shopModule: BotModule = {
  async register(bot: Telegraf<Context>) {
    bot.hears(['Магазин', 'Каталог'], async (ctx) => {
      await showCategories(ctx);
    });

    bot.action(new RegExp(`^${CATEGORY_ACTION_PREFIX}(.+)$`), async (ctx) => {
      const match = ctx.match as RegExpExecArray;
      const categoryId = match[1];
      await ctx.answerCbQuery();
      await logUserAction(ctx, 'shop:category', { categoryId });
      await sendProductCards(ctx, categoryId);
    });

    bot.action(new RegExp(`^${PRODUCT_MORE_PREFIX}(.+)$`), async (ctx) => {
      const match = ctx.match as RegExpExecArray;
      const productId = match[1];
      await handleProductMore(ctx, productId);
    });

    bot.action(new RegExp(`^${PRODUCT_CART_PREFIX}(.+)$`), async (ctx) => {
      const match = ctx.match as RegExpExecArray;
      const productId = match[1];
      await handleAddToCart(ctx, productId);
    });

    bot.action(new RegExp(`^${PRODUCT_BUY_PREFIX}(.+)$`), async (ctx) => {
      const match = ctx.match as RegExpExecArray;
      const productId = match[1];
      await handleBuy(ctx, productId);
    });
  },
};
