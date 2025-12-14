import crypto from 'crypto';
import { UserModel } from '../models/user.model';

export class AuthService {
    constructor() { }

    /**
     * Registers a new user
     */
    async register(username: string, password: string): Promise<any> {
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            throw new Error('User already exists');
        }

        const newUser = await UserModel.create({
            username,
            password, // In a real app, hash this!
            first_name: username
        });

        return newUser;
    }

    /**
     * Logs in a user
     */
    async login(username: string, password: string): Promise<any> {
        const user = await UserModel.findOne({ username, password });
        return user;
    }

    /**
     * Verifies the Telegram Web App init data.
     */
    async verifyTelegramAuth(initData: string): Promise<any> {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error("Bot token not configured");

        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');

        if (!hash) return null;

        urlParams.delete('hash');

        const dataCheckString = Array.from(urlParams.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash === hash) {
            // Valid
            const userStr = urlParams.get('user');
            if (userStr) {
                const tgUser = JSON.parse(userStr);

                // Find or create in DB
                let user = await UserModel.findOne({ telegram_id: tgUser.id });
                if (!user) {
                    user = await UserModel.create({
                        telegram_id: tgUser.id,
                        username: tgUser.username || `tg_${tgUser.id}`,
                        first_name: tgUser.first_name,
                        last_name: tgUser.last_name,
                        photo_url: tgUser.photo_url
                    });
                }

                return user;
            }
        }
        return null;
    }

    /**
     * Generates a one-time auth code for the user
     */
    async createAuthCode(telegramId: number): Promise<string> {
        // Generate random 8-char code
        const code = crypto.randomBytes(4).toString('hex');
        const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await UserModel.findOneAndUpdate(
            { telegram_id: telegramId },
            {
                authCode: code,
                authCodeExpires: expires
            }
        );

        return code;
    }

    /**
     * Verifies and consumes an auth code
     */
    async verifyAuthCode(code: string): Promise<any> {
        const user = await UserModel.findOne({ authCode: code });

        if (!user) return null;

        // Check expiry
        if (user.authCodeExpires && user.authCodeExpires < new Date()) {
            return null;
        }

        // Consume code (security)
        user.authCode = undefined;
        user.authCodeExpires = undefined;
        await user.save();

        return user;
    }
}
