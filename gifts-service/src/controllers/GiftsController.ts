import { Request, Response } from 'express';
import { GiftsService } from '../services/GiftsService';

const service = new GiftsService();

export class GiftsController {

    // Admin
    static async create(req: Request, res: Response) {
        try {
            const template = await service.createTemplate(req.body);
            res.json(template);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const templates = await service.getTemplates();
            res.json(templates);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }

    // User
    static async buy(req: Request, res: Response) {
        try {
            // Assume userId comes from Auth Middleware (in req.body or headers for MVP)
            const { userId, templateSlug } = req.body;
            const item = await service.purchaseGift(userId, templateSlug);
            res.json(item);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async myInventory(req: Request, res: Response) {
        try {
            const { userId } = req.query;
            if (!userId) throw new Error('UserId required');
            const items = await service.getInventory(String(userId));
            res.json(items);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async initOpen(req: Request, res: Response) {
        try {
            const { userId, inventoryId } = req.body;
            const riddle = await service.initOpen(inventoryId, userId);
            // Don't send answer in real prod :)
            res.json({
                question: riddle.question,
                riddleId: riddle.id,
                expiresAt: riddle.expiresAt
            });
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async verifyOpen(req: Request, res: Response) {
        try {
            const { userId, inventoryId, riddleId, answer } = req.body;
            const result = await service.verifyAndOpen(inventoryId, userId, riddleId, Number(answer));
            res.json(result);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }
}
