import { Telegraf, Markup } from 'telegraf';
import { Context } from '../../bot/context.js';
import { BotModule } from '../../bot/types.js';
import { getActiveReviews } from '../../services/review-service.js';
import { logUserAction } from '../../services/user-history.js';

export const reviewsModule: BotModule = {
  async register(bot: Telegraf<Context>) {
    bot.hears('Отзывы', async (ctx) => {
      try {
        await logUserAction(ctx, 'menu:reviews');
        await showReviews(ctx);
      } catch (error) {
        console.error('Error in reviews:', error);
        await ctx.reply(`Ошибка загрузки отзывов: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Handle "Read More" button callback
    bot.action(/^review_more_(.+)$/, async (ctx) => {
      try {
        const reviewId = ctx.match[1];
        const reviews = await getActiveReviews();
        const review = reviews.find(r => r.id === reviewId);
        
        if (review) {
          await ctx.reply(review.content);
          await ctx.answerCbQuery('✅');
        } else {
          await ctx.answerCbQuery('❌ Отзыв не найден');
        }
      } catch (error) {
        console.error('Error showing full review:', error);
        await ctx.answerCbQuery('❌ Ошибка');
      }
    });
  },
};

export async function showReviews(ctx: Context) {
  const reviews = await getActiveReviews();

  if (reviews.length === 0) {
    await ctx.reply('Отзывов пока нет. Добавьте их в админке.');
    return;
  }

  for (const review of reviews) {
    const header = `⭐ ${review.name}`;
    const link = review.link ? `\n\nПодробнее: ${review.link}` : '';
    
    const MAX_CAPTION_LENGTH = 1000;
    
    if (review.photoUrl) {
      const fullCaption = `${header}\n\n${review.content}${link}`;
      
      if (fullCaption.length > MAX_CAPTION_LENGTH) {
        const shortCaption = `${header}\n\n${review.content.substring(0, MAX_CAPTION_LENGTH - header.length - link.length - 50)}...${link}`;
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('📖 Ещё', `review_more_${review.id}`)]
        ]);
        await ctx.replyWithPhoto(review.photoUrl, { 
          caption: shortCaption,
          ...keyboard
        });
      } else {
        await ctx.replyWithPhoto(review.photoUrl, { caption: fullCaption });
      }
    } else {
      await ctx.reply(`${header}\n\n${review.content}${link}`);
    }
  }
}
