const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

async function resetPassword() {
    try {
        await dbConnect();
        console.log("Connected to DB");

        const email = 'admin@test.com';
        const newPassword = '123456';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const result = await User.findOneAndUpdate(
            { email: email },
            { password: hashedPassword }, // Update password
            { new: true }
        );

        if (result) {
            console.log(`Password for ${email} updated successfully.`);
            console.log("New Hash:", hashedPassword);
        } else {
            console.log(`User ${email} not found.`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

resetPassword();
