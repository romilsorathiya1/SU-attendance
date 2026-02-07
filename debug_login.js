
console.log("Script starting...");
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Hardcoded URI from .env
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

async function simulateLogin(email, password, role) {
    console.log(`\nAttempting login: Email=${email}, Role=${role}, Password=${password}`);
    const user = await User.findOne({ email, role });

    if (!user) {
        console.log("Result: User not found (or role mismatch)");
        return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        console.log("Result: Invalid credentials (password mismatch)");
    } else {
        console.log("Result: Login Successful!");
    }
}

async function runTests() {
    try {
        await dbConnect();
        console.log("Connected to DB");

        // 1. Correct Admin Login
        await simulateLogin('admin@test.com', '123456', 'Admin');

        // 2. Incorrect Role (Teacher)
        await simulateLogin('admin@test.com', '123456', 'Teacher');

        // 3. Incorrect Password
        await simulateLogin('admin@test.com', 'wrongpass', 'Admin');

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

runTests();
