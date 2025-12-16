import type { Context as TelegrafContext } from 'telegraf';

export interface SessionData {
  currentCategoryId?: string | null;
  lastProductId?: string | null;
}

export interface Context extends TelegrafContext {
  session: SessionData;
}
