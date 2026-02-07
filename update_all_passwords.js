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

const StudentSchema = new mongoose.Schema({
    enrollmentNo: { type: String, unique: true, required: true },
    name: String,
    email: { type: String, required: true },
    mobile: String,
    password: { type: String, required: true },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

async function resetAllPasswords() {
    try {
        await dbConnect();
        console.log("Connected to DB");

        const newPassword = '123456';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        console.log("Updating Users...");
        const userResult = await User.updateMany({}, { password: hashedPassword });
        console.log(`Updated ${userResult.modifiedCount} users.`);

        console.log("Updating Students...");
        const studentResult = await Student.updateMany({}, { password: hashedPassword });
        console.log(`Updated ${studentResult.modifiedCount} students.`);

        console.log("All passwords reset to '123456'.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

resetAllPasswords();
