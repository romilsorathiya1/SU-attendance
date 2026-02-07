const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/attendance_system';

async function dbConnect() {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    await mongoose.connect(MONGODB_URI);
}

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Teacher'], default: 'Teacher' },
    college: String,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function verifyLogin() {
    try {
        await dbConnect();
        console.log("Connected to DB");

        const email = 'admin@test.com';
        const passwordPlain = '123456';
        const role = 'Admin';

        console.log(`Searching for user: ${email} with role: ${role}`);
        const user = await User.findOne({ email, role });

        if (!user) {
            console.log("User not found in DB.");
            return;
        }

        console.log(`User found: ${user.name}`);
        console.log(`Stored Hash: ${user.password}`);

        console.log(`Comparing '${passwordPlain}' against stored hash...`);
        const isMatch = await bcrypt.compare(passwordPlain, user.password);

        console.log(`Match Result: ${isMatch}`);

        if (isMatch) {
            console.log("LOGIN SUCCESS");
        } else {
            console.log("LOGIN FAILED - Password Mismatch");

            // Debugging: Hash the plain password again and see what it looks like
            const testHash = await bcrypt.hash(passwordPlain, 10);
            console.log(`Fresh hash of '${passwordPlain}': ${testHash}`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

verifyLogin();
