import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  if (key === 'MONGO_URL') {
    // Mask password to safe print the structure
    const masked = value.replace(/:([^:@]+)@/, ':****@');
    console.log(`🔍 DEBUG: MONGO_URL loaded as: "${masked}"`);
  }
  return value;
}

export const env = {
  botToken: requireEnv('BOT_TOKEN'),
  botWebhookUrl: process.env.BOT_WEBHOOK_URL,
  botWebhookSecret: process.env.BOT_WEBHOOK_SECRET,
  adminChatId: process.env.ADMIN_CHAT_ID,
  databaseUrl: requireEnv('MONGO_URL'),
  adminEmail: requireEnv('ADMIN_EMAIL'),
  adminPassword: requireEnv('ADMIN_PASSWORD'),
  publicBaseUrl: requireEnv('PUBLIC_BASE_URL'),
};
