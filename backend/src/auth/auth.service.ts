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
        console.log(`[Auth] Attempting login for: ${username}`);
        // 1. Check ENV defined admins first
        // Format: "user1:pass1;user2:pass2"
        const envAdmins = process.env.ADMIN_ACCOUNTS || '';
        if (envAdmins) {
            const accounts = envAdmins.split(';');
            for (const account of accounts) {
                const [envUser, envPass] = account.split(':');
                if (envUser && envPass &&
                    envUser.trim() === username &&
                    envPass.trim() === password) {

                    // Return synthetic admin user
                    return {
                        id: `admin_${username}`,
                        username: username,
                        first_name: 'Admin',
                        last_name: 'User',
                        isAdmin: true
                    };
                }
            }
        }

        // 2. Fallback to Database
        const user = await UserModel.findOne({ username, password });
        if (!user) {
            console.log(`[Auth] ❌ User ${username} not found in DB or password mismatch.`);
        } else {
            console.log(`[Auth] ✅ User ${username} authenticated via DB.`);
        }
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

                // Cloudinary Avatar Logic
                let photoUrl = tgUser.photo_url;
                try {
                    // Upload if photo exists and (user is new OR user has no photo OR photo is not from cloudinary)
                    // Simple check: if tg provids photo, and current user photo is not cloudinary, upload it.
                    const isCloudinary = user?.photo_url?.includes('cloudinary');
                    if (photoUrl && !isCloudinary) {
                        const { CloudinaryService } = await import('../services/cloudinary.service');
                        const cloudinaryService = new CloudinaryService();
                        photoUrl = await cloudinaryService.uploadImage(photoUrl, 'moneo_avatars');
                    }
                } catch (e) {
                    console.error("Avatar upload failed", e);
                    // Fallback to original URL
                }

                if (!user) {
                    user = await UserModel.create({
                        telegram_id: tgUser.id,
                        username: tgUser.username || `tg_${tgUser.id}`,
                        first_name: tgUser.first_name,
                        last_name: tgUser.last_name,
                        photo_url: photoUrl
                    });
                } else {
                    // Update user info if changed
                    let changed = false;
                    // Force update photo if provided (Telegram photo might have changed)
                    if (photoUrl && user.photo_url !== photoUrl) {
                        user.photo_url = photoUrl;
                        changed = true;
                    }
                    if (tgUser.username && user.username !== tgUser.username) {
                        user.username = tgUser.username;
                        changed = true;
                    }
                    if (tgUser.first_name && user.first_name !== tgUser.first_name) {
                        user.first_name = tgUser.first_name;
                        changed = true;
                    }
                    // Ensure last_name is updated too
                    if (tgUser.last_name !== undefined && user.last_name !== tgUser.last_name) {
                        user.last_name = tgUser.last_name;
                        changed = true;
                    }

                    if (changed) await user.save();
                }

                // SYNC BALANCES FROM PARTNERSHIP SERVICE
                try {
                    const { PartnershipClient } = await import('../services/partnership.client');
                    const balances = await PartnershipClient.getBalances(user._id);

                    user.greenBalance = balances.green;
                    user.yellowBalance = balances.yellow;
                    user.balanceRed = balances.red;
                    user.referralBalance = balances.referral; // Legacy check

                    await user.save();
                    console.log(`[Auth] Synced balances for ${user.username}: Red=${balances.red}, Green=${balances.green}`);
                } catch (syncError: any) {
                    console.error(`[Auth] Balance sync failed for ${user.username}:`, syncError.message);
                    // Don't fail login, just log error
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
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days (User Request: Permanent Link)

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

        // DO NOT consume code (User Request: Link valid for 12 hours)
        // user.authCode = undefined;
        // user.authCodeExpires = undefined;
        // await user.save();

        return user;
    }
    async getUserById(id: string): Promise<any> {
        return UserModel.findById(id);
    }
}
