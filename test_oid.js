
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const userId = "6840451873";
    console.log(`Testing userId: "${userId}"`);
    console.log(`isValid(userId):`, mongoose.Types.ObjectId.isValid(userId));

    if (!process.env.MONGO_URI_PARTNERSHIP) {
        // Try fallback or just check local env
        const uri = process.env.MONGO_URL || process.env.DATABASE_URL; // Likely undefined here if not running in context
        // I'll just check logic for now if I can't connect
    }

    // Check Parsing
    try {
        new mongoose.Types.ObjectId(userId);
        console.log("new ObjectId(userId) SUCCEEDED (Unexpected for numeric string)");
    } catch (e) {
        console.log("new ObjectId(userId) FAILED as expected:", e.message);
    }

    // Connect to DB if possible (need to know URI)
    const uri = process.env.MONGO_URI_PARTNERSHIP || process.env.MONGO_URL;
    if (uri) {
        await mongoose.connect(uri);
        console.log("Connected to DB");

        // Define minimal User schema
        const UserSchema = new mongoose.Schema({ telegram_id: Number });
        const User = mongoose.model('User', UserSchema);

        const u = await User.findOne({ telegram_id: Number(userId) });
        console.log("User found?", u ? `Yes: ${u._id}` : "No");

        if (u) {
            const hex = u._id.toString();
            console.log("Target Hex:", hex);
            try {
                new mongoose.Types.ObjectId(hex);
                console.log("Hex is valid ObjectId");
            } catch (e) {
                console.error("Hex is INVALID:", e.message);
            }
        }

        await mongoose.disconnect();
    } else {
        console.log("Skipping DB check (no URI)");
    }
}

run();
