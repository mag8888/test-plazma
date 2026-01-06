import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';

const router = Router();

// We create a fresh instance here, or we could inject it if we had DI.
// Ideally, AuthService should be a singleton or stateless.
const authService = new AuthService();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        console.log(`[MagicLogin] Attempting login with code: '${code}'`);

        if (!code) return res.status(400).json({ error: "Missing code" });

        const user = await authService.verifyAuthCode(code);

        if (!user) {
            console.warn(`[MagicLogin] Code rejected: User not found or expired.`);
            return res.status(401).json({ error: "Invalid or expired code" });
        }

        console.log(`[MagicLogin] Success for user: ${user.username} (${user._id})`);

        return res.json({
            token: "mock-jwt-token-for-" + user._id, // In prod use JWT
            message: 'Login successful',
            user: {
                id: user._id.toString(),
                telegram_id: user.telegram_id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                photo_url: user.photo_url,
                isAdmin: user.isAdmin || false
            }
        });

    } catch (error: any) {
        console.error("Magic login error:", error);
        return res.status(500).json({ error: "Internal Server Error: " + error.message });
    }
});

export const MagicLoginController = router;
