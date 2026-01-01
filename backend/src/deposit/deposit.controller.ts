import { Request, Response } from 'express';
import { DepositRequestModel } from '../models/deposit-request.model';
import { UserModel } from '../models/user.model';
import { CloudinaryService } from '../services/cloudinary.service';
import { BotService } from '../bot/bot.service';

const cloudinaryService = new CloudinaryService();

export class DepositController {
    static async requestDeposit(req: Request, res: Response) {
        try {
            const { userId, amount, proofBase64 } = req.body;

            if (!userId || !amount || !proofBase64) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Upload Base64 to Cloudinary
            const uploadRes = await cloudinaryService.uploadImage(proofBase64, 'details/deposits');

            const request = await DepositRequestModel.create({
                user: user._id,
                amount: Number(amount),
                currency: 'USD',
                proofUrl: uploadRes, // Returns string URL
                status: 'PENDING'
            });

            // Notify Admin via Bot (assuming bot instance is accessible or we instantiate service)
            // Note: BotService is stateful with 'bot' instance. 
            // If we create new BotService, it might try to reconnect or claim session.
            // Ideally we should use the singleton exported or available.
            // In backend/src/index.ts, botService is global 'botService'.
            // But we can't easily import it here if it's not exported.

            // Hack/Fix: Use global.bot if defined, or assume we can just use BotService if it allows sending without running polling?
            // BotService constructor starts polling. We don't want that.
            // We should use global variable or singleton pattern.
            // backend/src/index.ts defines `global.bot`.

            if (global.bot) {
                const adminMsg =
                    `💰 <b>Заявка на пополнение (Mini App)</b>\n` +
                    `👤 Пользователь: @${user.username} (ID: ${user.telegram_id})\n` +
                    `💵 Сумма: <b>$${amount}</b>\n` +
                    `📅 Дата: ${new Date().toLocaleString()}\n` +
                    `📄 ID заявки: ${request._id}`;

                const adminIdsStr = process.env.ADMIN_IDS || process.env.ADMIN_ID || '';
                const adminIds = adminIdsStr.split(',').map(id => id.trim()).filter(id => id);

                for (const adminId of adminIds) {
                    // We need to send PHOTO if possible, but proofBase64 is base64.
                    // We have proofUrl (remote). Telegram sendPhoto supports URL.
                    await global.bot.sendPhoto(adminId, request.proofUrl, {
                        caption: adminMsg,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ Подтвердить', callback_data: `approve_deposit_${request._id}` }],
                                [{ text: '❌ Отклонить', callback_data: `reject_deposit_${request._id}` }]
                            ]
                        }
                    });
                }
            } else {
                console.warn('Global bot instance not found, admin notification skipped.');
            }

            res.json({ success: true, request });

        } catch (error: any) {
            console.error('Deposit Request Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
