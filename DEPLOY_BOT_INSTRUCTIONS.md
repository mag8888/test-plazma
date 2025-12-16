# 🤖 How to Launch the Telegram Bot on Railway

I have successfully extracted the bot source code (which was hidden in a compressed file) and migrated it to support **MongoDB** (it was originally configured for PostgreSQL).

To launch the bot alongside your game, follow these steps:

## 1. Commit and Push
I have already prepared the code. You just need to approve the changes and push to GitHub.

## 2. Configure Railway
Since your Game and Bot are in the same repository, you should likely create a **second Service** in your Railway project for the Bot, or configure your existing service to run both (though separate services are recommended for stability).

### Recommended: Separate Bot Service
1. In Railway, click **New** -> **GitHub Repo** -> Select `plazma`.
2. This will create a second service identical to the first.
3. Go to **Settings** for this new service:
   - **Service Name**: Change to `plazma-bot` (optional).
   - **Build Command**: `npm run build` (This will now build the bot thanks to my updates).
   - **Start Command**: `npm run start:bot` (This is the critical change).
   
4. Go to **Variables** and set the following:
   - `DATABASE_URL`: Your MongoDB connection string (same as the Game).
   - `BOT_TOKEN`: Your Telegram Bot Token from @BotFather.
   - `ADMIN_EMAIL`: Email for the Bot's Admin Panel login.
   - `ADMIN_PASSWORD`: Password for the Bot's Admin Panel.
   - `PUBLIC_BASE_URL`: The URL of your **Game** (e.g., `https://plazma-production.up.railway.app`).
   - `ADMIN_CHAT_ID`: (Optional) Your Telegram ID to receive admin notifications.

## 3. Deployment
Once variables are set and the code is pushed, Railway should deploy usage.

## Technical Details of Changes I Made
- **Extracted Bot Code**: Retrieved from `plazma-bot-source.tar.gz`.
- **Migrated to MongoDB**: Updated Prisma schema and refactored TypeScript code to use String IDs instead of Numbers.
- **Updated package.json**: Added `start:bot` script and configured `build` to compile the bot.
- **Verified Build**: The bot compiles successfully with the new MongoDB schema.
