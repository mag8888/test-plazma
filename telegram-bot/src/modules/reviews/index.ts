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
        await showReviews(ctx, 0);
      } catch (error) {
        console.error('Error in reviews:', error);
        await ctx.reply(`Ошибка загрузки отзывов: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Handle "Next Review" button callback
    bot.action(/^review_next_(\d+)$/, async (ctx) => {
      try {
        const nextIndex = parseInt(ctx.match[1]);
        await showReviews(ctx, nextIndex);
        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error showing next review:', error);
        await ctx.answerCbQuery('❌ Ошибка');
      }
    });

    // Handle "Show Full Text" button callback
    bot.action(/^review_full_(.+)$/, async (ctx) => {
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

export async function showReviews(ctx: Context, startIndex: number = 0) {
  const reviews = await getActiveReviews();

  if (reviews.length === 0) {
    await ctx.reply('Отзывов пока нет. Добавьте их в админке.');
    return;
  }

  if (startIndex >= reviews.length) {
    await ctx.reply('Больше отзывов нет.');
    return;
  }

  const review = reviews[startIndex];
  const header = `⭐ ${review.name}`;
  const link = review.link ? `\n\nПодробнее: ${review.link}` : '';
  
  const MAX_CAPTION_LENGTH = 1000;
  const hasMore = startIndex + 1 < reviews.length;
  
  if (review.photoUrl) {
    const fullCaption = `${header}\n\n${review.content}${link}`;
    
    if (fullCaption.length > MAX_CAPTION_LENGTH) {
      // Long review - truncate with "Read Full" button
      const shortCaption = `${header}\n\n${review.content.substring(0, MAX_CAPTION_LENGTH - header.length - link.length - 50)}...${link}`;
      
      const buttons = [];
      buttons.push([Markup.button.callback('📖 Полный текст', `review_full_${review.id}`)]);
      if (hasMore) {
        buttons.push([Markup.button.callback('➡️ Ещё отзыв', `review_next_${startIndex + 1}`)]);
      }
      
      const keyboard = Markup.inlineKeyboard(buttons);
      await ctx.replyWithPhoto(review.photoUrl, { 
        caption: shortCaption,
        ...keyboard
      });
    } else {
      // Short review - just "Next" button if there are more
      if (hasMore) {
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('➡️ Ещё отзыв', `review_next_${startIndex + 1}`)]
        ]);
        await ctx.replyWithPhoto(review.photoUrl, { 
          caption: fullCaption,
          ...keyboard
        });
      } else {
        await ctx.replyWithPhoto(review.photoUrl, { caption: fullCaption });
      }
    }
  } else {
    // No photo
    const message = `${header}\n\n${review.content}${link}`;
    
    if (hasMore) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('➡️ Ещё отзыв', `review_next_${startIndex + 1}`)]
      ]);
      await ctx.reply(message, keyboard);
    } else {
      await ctx.reply(message);
    }
  }
}
