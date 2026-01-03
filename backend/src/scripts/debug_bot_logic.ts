
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../models/user.model';
import { ScheduledGameModel } from '../models/scheduled-game.model';
import { AuthService } from '../auth/auth.service';

dotenv.config();

const run = async () => {
    try {
        if (!process.env.MONGO_URL) {
            console.error('MONGO_URL missing');
            return;
        }

        await mongoose.connect(process.env.MONGO_URL, { dbName: 'moneo' });
        console.log('Connected to DB');

        // Find Real User
        const targetUsername = 'roman_arctur';
        const user = await UserModel.findOne({ username: targetUsername });
        if (!user) {
            console.log(`User ${targetUsername} not found. Cannot proceed properly.`);
            return;
        }
        const chatId = user.telegram_id;
        console.log(`User found: ${user.username} (ID: ${user._id}, ChatID: ${chatId})`);

        console.log('\n--- Testing handlePlay Logic with Real User ---');
        try {
            console.log('Creating Auth Code...');
            const authService = new AuthService();
            const code = await authService.createAuthCode(chatId!);
            console.log('Auth Code generated:', code);
        } catch (e) {
            console.error('handlePlay Error:', e);
        }

        console.log('\n--- Testing handleSchedule Logic (Simulating renderGameCard) ---');
        try {
            const now = new Date();
            const games = await ScheduledGameModel.find({
                startTime: { $gt: now },
                status: 'SCHEDULED'
            }).sort({ startTime: 1 }).limit(10);

            console.log(`Found ${games.length} games.`);

            for (const game of games) {
                console.log(`\nProcessing Game ${game._id} at ${game.startTime}`);
                console.log('  Host ID:', game.hostId);

                try {
                    const host = await UserModel.findById(game.hostId);
                    console.log('  Host Found:', host ? host.username || host.first_name : 'NULL (Host Missing!)');

                    if (!host) {
                        console.warn('  WARNING: Host is missing from DB! this might be the cause.');
                    }

                    console.log('  Participants:', game.participants.length);
                    // Check participants
                    for (const p of game.participants) {
                        if (p.userId) {
                            const pUser = await UserModel.findById(p.userId);
                            // console.log(`    - Participant ${p.userId}: ${pUser ? 'Found' : 'MISSING'}`);
                            if (!pUser) console.warn(`    WARNING: Participant ${p.userId} missing!`);
                        } else {
                            console.log('    - Participant has no userId (guest?)');
                        }
                    }

                } catch (innerE) {
                    console.error(`  CRASH in renderGameCard simulation for game ${game._id}:`, innerE);
                }
            }

        } catch (e) {
            console.error('handleSchedule loop Error:', e);
        }

    } catch (e) {
        console.error('Global Error:', e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
