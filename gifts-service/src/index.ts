import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { GiftsController } from './controllers/GiftsController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/moneo';

app.use(cors());
app.use(express.json());

// Routes
const router = express.Router();

// Public / User
router.get('/templates', GiftsController.list);
router.get('/inventory', GiftsController.myInventory);
router.post('/buy', GiftsController.buy);
router.post('/open-init', GiftsController.initOpen);
router.post('/open-verify', GiftsController.verifyOpen);

// Admin (Should be protected)
router.post('/admin/templates', GiftsController.create);

app.use('/api/gifts', router);

app.get('/health', (req, res) => res.send('Gifts Service OK'));

// Connect DB
mongoose.connect(MONGO_URL)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Gifts Service running on port ${PORT}`);
        });
    })
    .catch(err => console.error('MongoDB connection error:', err));
