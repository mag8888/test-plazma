import { AdminController } from './controllers/AdminController';

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
app.post('/api/subscribe', PartnershipController.subscribe as any);
app.post('/api/withdraw', PartnershipController.withdraw as any);
app.get('/api/tree/:userId', PartnershipController.getTree as any);
app.get('/api/stats/:userId', PartnershipController.getStats as any);

// Admin Routes
const adminRouter = express.Router();
adminRouter.use(AdminController.authenticate as any);
adminRouter.get('/users', AdminController.getUsers as any);
adminRouter.post('/balance', AdminController.updateBalance as any);
adminRouter.get('/stats', AdminController.getGlobalStats as any);

app.use('/api/admin', adminRouter);

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
