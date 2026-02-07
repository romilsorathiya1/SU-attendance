const mongoose = require('mongoose');

// Load env vars if needed, or hardcode for now based on what we see in .env later
// asking user for .env content might be better but I will try to read it first.
const MONGODB_URI = 'mongodb://localhost:27017/attendance_system';

async function dbConnect() {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    return mongoose.connect(MONGODB_URI);
}

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Teacher'], default: 'Teacher' },
    college: String,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function listUsers() {
    try {
        await dbConnect();
        console.log("Connected to DB");

        const users = await User.find({});
        console.log("Found users:", users.length);
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) Role: ${u.role}, PasswordHash: ${u.password.substring(0, 10)}...`);
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

listUsers();
