
import { Request, Response } from 'express';
import { DepositRequest, DepositStatus, DepositMethod } from '../models/DepositRequest';
import { User } from '../models/User';

export class FinanceController {

    static async createDepositRequest(req: Request, res: Response) {
        try {
            const { userId, amount, method, currency } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }

            if (!Object.values(DepositMethod).includes(method)) {
                return res.status(400).json({ error: 'Invalid method' });
            }

            // Verify user exists
            const user = await User.findOne({ telegram_id: userId }); // Assuming userId is telegram_id
            if (!user) {
                // Try finding by internal ID
                const byId = await User.findById(userId);
                if (!byId) return res.status(404).json({ error: 'User not found' });
            }

            const deposit = new DepositRequest({
                userId, // Store whatever ID was passed (usually telegramId for simplicity in cross-service)
                amount,
                currency: currency || 'USD',
                method,
                status: DepositStatus.PENDING
            });

            await deposit.save();

            // Return payment details based on method
            let payTo = '';
            if (method === DepositMethod.USDT_BEP20) payTo = '0xb15e97ad107d57f5ca5405556877395848cf745d';
            else if (method === DepositMethod.USDT_TRC20) payTo = 'TG8Ltochc5rYz54M5SeRPbMq7Xj9ovz7j9';
            else if (method === DepositMethod.SBER_RUB) payTo = '+79164632850 (Роман Богданович П.)';

            res.json({ success: true, request: deposit, payTo });
        } catch (e: any) {
            console.error("Create Deposit Error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async submitProof(req: Request, res: Response) {
        try {
            const { requestId, proofUrl } = req.body;

            if (!requestId || !proofUrl) {
                return res.status(400).json({ error: 'Missing requestId or proofUrl' });
            }

            const deposit = await DepositRequest.findById(requestId);
            if (!deposit) {
                return res.status(404).json({ error: 'Request not found' });
            }

            deposit.proofUrl = proofUrl;
            // deposit.status = DepositStatus.PENDING; // Still pending admin approval
            await deposit.save();

            // Notify Admin via Telegram
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const adminIdsStr = process.env.ADMIN_IDS || process.env.ADMIN_ID || '';
            let adminIds = adminIdsStr.split(',').map(id => id.trim()).filter(id => id);

            // FALLBACK ADMIN ID (if env missing)
            if (adminIds.length === 0) {
                console.warn('[Finance] No ADMIN_IDS in env, using fallback.');
                adminIds.push('6840451873');
            }

            if (!token) {
                console.error('[Finance] CRITICAL: TELEGRAM_BOT_TOKEN is missing! Cannot notify admin.');
            } else if (adminIds.length > 0) {
                const adminMsg =
                    `💰 <b>Заявка на пополнение (Web)</b>\n` +
                    `👤 User ID: ${deposit.userId}\n` +
                    `💵 Сумма: <b>$${deposit.amount}</b>\n` +
                    `💳 Способ: ${deposit.method}\n` +
                    `📄 ID заявки: ${deposit._id}`;

                // Send to each admin
                for (const adminId of adminIds) {
                    try {
                        console.log(`[Finance] Sending notification to admin ${adminId}...`);
                        // Use native fetch to call Telegram API
                        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: adminId,
                                photo: proofUrl,
                                caption: adminMsg,
                                parse_mode: 'HTML',
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '✅ Подтвердить', callback_data: `approve_deposit_${deposit._id}` }],
                                        [{ text: '❌ Отклонить', callback_data: `reject_deposit_${deposit._id}` }]
                                    ]
                                }
                            })
                        });

                        if (!tgRes.ok) {
                            console.error(`[Finance] Telegram API Error for ${adminId}:`, await tgRes.text());
                        } else {
                            console.log(`[Finance] Notification sent to ${adminId}`);
                        }
                    } catch (notifyErr) {
                        console.error(`Failed to notify admin ${adminId}:`, notifyErr);
                    }
                }
            }

            res.json({ success: true, request: deposit });
        } catch (e: any) {
            console.error("Submit Proof Error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async getPendingRequests(req: Request, res: Response) {
        try {
            const requests = await DepositRequest.find({ status: DepositStatus.PENDING }).sort({ createdAt: -1 });
            res.json(requests);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
}
