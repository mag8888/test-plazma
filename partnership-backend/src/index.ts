import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import { PartnershipController } from './controllers/PartnershipController';
import { AdminController } from './controllers/AdminController';
import { WalletController } from './controllers/WalletController';
import { FinanceController } from './controllers/FinanceController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Debug Middleware
app.use((req, res, next) => {
    console.log(`[Partnership] Incoming: ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('Trinar Partnership Service API');
});
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// API Routes
app.post('/api/user', PartnershipController.createUser as any);
// app.post('/api/subscribe', PartnershipController.subscribe as any); // DEPRECATED - use /api/avatars/purchase instead
app.post('/api/withdraw', PartnershipController.withdraw as any);
app.get('/api/tree/:userId', PartnershipController.getTree as any);
app.get('/api/stats/:userId', PartnershipController.getStats as any);
app.get('/api/partners/:userId', PartnershipController.getPartners as any);

// Avatar Routes
app.post('/api/avatars/purchase', PartnershipController.purchaseAvatar as any);
app.get('/api/avatars/my-avatars/:userId', PartnershipController.getMyAvatars as any);
app.get('/api/avatars/premium-count', PartnershipController.getPremiumCount as any);
app.get('/api/avatars/matrix/:avatarId', PartnershipController.getAvatarMatrix as any);
app.get('/api/stats', PartnershipController.getGlobalStats as any);

// Admin Routes
const adminRouter = express.Router();
adminRouter.use(AdminController.authenticate as any);
adminRouter.get('/users', AdminController.getUsers as any);
adminRouter.get('/users/:userId/transactions', AdminController.getUserTransactions as any);
adminRouter.get('/users/:userId/history', AdminController.getUserHistory as any);
adminRouter.post('/balance', AdminController.updateBalance as any);
adminRouter.post('/referrer', AdminController.updateReferrer as any);
adminRouter.get('/stats', AdminController.getGlobalStats as any);
adminRouter.get('/logs', AdminController.getLogs as any);
adminRouter.post('/rebuild-referrals', AdminController.rebuildReferrals as any);
adminRouter.get('/check-referrers', AdminController.checkReferrers as any); // Debug endpoint
adminRouter.post('/avatars/add', AdminController.addAvatar as any);
adminRouter.delete('/avatars/delete-all', AdminController.deleteAllAvatars as any);
adminRouter.post('/avatars/recalculate', AdminController.recalculateAvatars as any);
adminRouter.get('/users/:userId/avatars', AdminController.getUserAvatars as any);
adminRouter.get('/avatars/root', AdminController.getRootAvatar as any);
adminRouter.post('/audit', AdminController.auditBonuses as any);
adminRouter.post('/audit/fix', AdminController.auditFix as any);


// Wallet Routes (Protected by Admin Secret or Internal Network)
// Ideally should be protected, but for now we rely on internal network proxy from backend
const walletRouter = express.Router();
walletRouter.get('/balance/:userId', WalletController.getBalance as any);
walletRouter.post('/charge', WalletController.charge as any);
walletRouter.post('/deposit', WalletController.deposit as any);

app.use('/api/wallet', walletRouter);

// Finance Routes
const financeRouter = express.Router();
financeRouter.post('/deposit', FinanceController.createDepositRequest as any);
financeRouter.post('/proof', FinanceController.submitProof as any);
financeRouter.get('/pending', FinanceController.getPendingRequests as any); // Should be admin protected later
app.use('/api/finance', financeRouter);

app.use('/api/admin', adminRouter);

app.get('/health', (req, res) => {
    // console.log('[Health] Check received');
    res.status(200).send('OK');
});

// Using '0.0.0.0' is crucial for Docker/Railway environments to expose the port correctly
const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`Server running on port ${PORT} (0.0.0.0)`);
        });

        // Graceful Shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });
    } catch (e) {
        console.error('Failed to start server:', e);
        process.exit(1);
    }
};

startServer();
