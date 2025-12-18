import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';

const router = Router();
const authService = new AuthService();

router.post('/register', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });

        const user = await authService.register(username, password);
        return res.json({
            token: "mock-jwt-token-for-" + user.id,
            user: { id: user.id, username: user.username, firstName: user.first_name }
        });
    } catch (e: any) {
        return res.status(400).json({ error: e.message });
    }
});

router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const user = await authService.login(username, password);
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        return res.json({
            token: "mock-jwt-token-for-" + user.id,
            user: { id: user.id, username: user.username, firstName: user.first_name }
        });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
});

router.post('/login/telegram', async (req: Request, res: Response) => {
    try {
        const { initData } = req.body;
        if (!initData) {
            return res.status(400).json({ error: "Missing initData" });
        }

        const user = await authService.verifyTelegramAuth(initData);

        if (!user) {
            return res.status(401).json({ error: "Invalid Telegram credentials" });
        }

        // TODO: Find or Create user in Database
        // For now, return the user info and a mock token

        console.log("User logged in:", user.first_name, user.id);

        return res.json({
            token: "mock-jwt-token-for-" + user.id,
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                photo_url: user.photo_url,
                referralBalance: user.referralBalance || 0,
                balanceRed: user.balanceRed || 0,
                referralsCount: user.referralsCount || 0,
                isMaster: user.isMaster || false
            }
        });
    } catch (error) {
        console.error("Auth error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post('/magic-login', async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Missing code" });

        const user = await authService.verifyAuthCode(code);
        if (!user) {
            return res.status(401).json({ error: "Invalid or expired code" });
        }

        return res.json({
            token: "mock-jwt-token-for-" + user.id, // In prod use JWT
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                photo_url: user.photo_url
            }
        });

    } catch (error) {
        console.error("Magic login error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export const AuthController = router;
