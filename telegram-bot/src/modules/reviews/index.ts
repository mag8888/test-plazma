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
          const header = `⭐ ${review.name}`;
          const link = review.link ? `\n\nПодробнее: ${review.link}` : '';

          // Telegram caption limit is 1024 characters
          const MAX_CAPTION_LENGTH = 1000; // Leave some buffer

          if (review.photoUrl) {
            // If content + header + link is too long, truncate content
            const fullCaption = `${header}\n\n${review.content}${link}`;

            if (fullCaption.length > MAX_CAPTION_LENGTH) {
              // Send photo with shortened caption and content as separate message
              const shortCaption = `${header}\n\n${review.content.substring(0, MAX_CAPTION_LENGTH - header.length - link.length - 50)}...${link}`;
              await ctx.replyWithPhoto(review.photoUrl, { caption: shortCaption });

              // Send full content as separate message if it was truncated
              if (review.content.length > MAX_CAPTION_LENGTH - header.length - link.length - 50) {
                await ctx.reply(review.content);
              }
            } else {
              await ctx.replyWithPhoto(review.photoUrl, { caption: fullCaption });
            }
          } else {
            // No photo, just send text
            await ctx.reply(`${header}\n\n${review.content}${link}`);
          }
        }
      } catch (error) {
        console.error('Error in reviews:', error);
        await ctx.reply(`Ошибка загрузки отзывов: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  },
};
