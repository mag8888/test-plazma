import { Telegraf } from 'telegraf';
import { Context } from '../../bot/context.js';
import { BotModule } from '../../bot/types.js';
import { getActiveReviews } from '../../services/review-service.js';
import { logUserAction } from '../../services/user-history.js';

export const reviewsModule: BotModule = {
  async register(bot: Telegraf<Context>) {
    bot.hears('Отзывы', async (ctx) => {
      try {
        await logUserAction(ctx, 'menu:reviews');
        const reviews = await getActiveReviews();

        if (reviews.length === 0) {
          await ctx.reply('Отзывов пока нет. Добавьте их в админке.');
          return;
        }

        for (const review of reviews) {
          const caption = [`⭐ ${review.name}`, review.content];
          if (review.link) {
            caption.push(`Подробнее: ${review.link}`);
          }

          if (review.photoUrl) {
            await ctx.replyWithPhoto(review.photoUrl, { caption: caption.join('\n\n') });
          } else {
            await ctx.reply(caption.join('\n\n'));
          }
        }
      } catch (error) {
        console.error('Error in reviews:', error);
        await ctx.reply(`Ошибка загрузки отзывов: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  },
};
