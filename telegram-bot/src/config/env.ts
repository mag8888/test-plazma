import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  let finalValue = value;

  if (key === 'MONGO_URL') {
    // Check if the URL ends with a port number (missing database name)
    if (/:\d+$/.test(value)) {
      console.log('⚠️ DEBUG: MONGO_URL missing database name. Auto-appending /plazma...');
      finalValue = `${value}/plazma?authSource=admin`;
    }

    // Mask password to safe print the structure
    const masked = finalValue.replace(/:([^:@]+)@/, ':****@');
    console.log(`🔍 DEBUG: MONGO_URL loaded as: "${masked}"`);
  }
  return finalValue;
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
