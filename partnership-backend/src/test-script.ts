import mongoose from 'mongoose';
import { connectDB } from './db';
import { User } from './models/User';
import { MatrixService } from './services/MatrixService';
import { FinanceService } from './services/FinanceService';
import { TariffType } from './models/Avatar';
import dotenv from 'dotenv';
dotenv.config();

const runTest = async () => {
    await connectDB();

    // Cleanup
    await User.deleteMany({});
    // await Avatar.deleteMany({}); // Need export? Model is in models/Avatar
    // For simplicity, just test logic flow assuming clean DB or new IDs

    console.log('Creating Root User...');
    const rootUser = await User.create({ telegramId: 'root', username: 'root' });

    console.log('Root buys PARTNER tariff...');
    // Payment of 1000 - No referrer so system gets it
    const rootAvatar = await MatrixService.placeAvatar(rootUser.id, TariffType.PARTNER);
    console.log('Root placed:', rootAvatar._id);

    console.log('Creating Child User 1...');
    const child1 = await User.create({ telegramId: 'child1', username: 'child1', referrer: rootUser._id });

    console.log('Child 1 buys PLAYER tariff ($20)...');
    await FinanceService.distributePayment(20, child1.id, rootUser.id);
    const av1 = await MatrixService.placeAvatar(child1.id, TariffType.PLAYER, rootUser.id);
    console.log('Child 1 placed under:', av1.parent);

    // Check Root Balance
    const updatedRoot = await User.findById(rootUser.id);
    console.log('Root Balance:', updatedRoot?.greenBalance, 'Yellow:', updatedRoot?.yellowBalance);
    // Should be Green: 10, Yellow: 10

    if (updatedRoot?.greenBalance === 10 && updatedRoot?.yellowBalance === 10) {
        console.log('PASS: Payment Distribution Verified');
    } else {
        console.error('FAIL: Payment Distribution');
    }

    if (av1.parent?.toString() === rootAvatar._id.toString()) {
        console.log('PASS: Placement Verified');
    } else {
        console.error('FAIL: Placement');
    }

    console.log('Done.');
    process.exit(0);
};

runTest();
