import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import { PartnershipController } from './controllers/PartnershipController';
import { AdminController } from './controllers/AdminController';
import { WalletController } from './controllers/WalletController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Trinar Partnership Service API');
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

// Admin Routes
const adminRouter = express.Router();
adminRouter.use(AdminController.authenticate as any);
adminRouter.get('/users', AdminController.getUsers as any);
adminRouter.post('/balance', AdminController.updateBalance as any);
adminRouter.post('/referrer', AdminController.updateReferrer as any);
adminRouter.get('/stats', AdminController.getGlobalStats as any);
adminRouter.get('/logs', AdminController.getLogs as any);
adminRouter.post('/rebuild-referrals', AdminController.rebuildReferrals as any);
adminRouter.get('/check-referrers', AdminController.checkReferrers as any); // Debug endpoint
adminRouter.post('/avatars/add', AdminController.addAvatar as any);
adminRouter.delete('/avatars/delete-all', AdminController.deleteAllAvatars as any);


// Wallet Routes (Protected by Admin Secret or Internal Network)
// Ideally should be protected, but for now we rely on internal network proxy from backend
const walletRouter = express.Router();
walletRouter.get('/balance/:userId', WalletController.getBalance as any);
walletRouter.post('/charge', WalletController.charge as any);
walletRouter.post('/deposit', WalletController.deposit as any);

app.use('/api/wallet', walletRouter);

app.use('/api/admin', adminRouter);

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
