
const mongoose = require('mongoose');

const userId = "6840451873";
console.log(`Testing userId: "${userId}"`);
console.log(`isValid(userId):`, mongoose.Types.ObjectId.isValid(userId));

try {
    new mongoose.Types.ObjectId(userId);
    console.log("new ObjectId(userId) SUCCEEDED");
} catch (e) {
    console.log("new ObjectId(userId) FAILED:", e.message);
}
