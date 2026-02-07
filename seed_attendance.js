const mongoose = require('mongoose');

// Adjust URI if needed, but assuming localhost default based on other scripts
const MONGODB_URI = 'mongodb://localhost:27017/attendance_system';

async function dbConnect() {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    return mongoose.connect(MONGODB_URI);
}

// Re-define Schemas to avoid ESM/CommonJS issues
const StudentSchema = new mongoose.Schema({
    enrollmentNo: { type: String, unique: true, required: true },
    name: String,
    email: { type: String, required: true },
    mobile: String,
    password: { type: String, required: true },
    college: String,
    course: String,
    semester: String,
    class: String,
});

const AttendanceSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    studentName: String,
    date: String,
    status: { type: String, enum: ['Present', 'Absent'] },
    subject: String,
    startTime: String,
    endTime: String,
    college: String,
    course: String,
    semester: String,
    class: String,
    recordedBy: String,
});

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

async function seedAttendance() {
    try {
        await dbConnect();
        console.log("Connected to DB");

        // 1. Find all BCA Semester 1 students
        // We match exactly 'BCA' and 'Semester 1'
        const students = await Student.find({
            course: 'BCA',
            semester: 'Semester 1'
        });

        console.log(`Found ${students.length} BCA Semester 1 students.`);

        if (students.length === 0) {
            console.log("No students found. Exiting.");
            process.exit(0);
        }

        const attendanceRecords = [];
        const subjects = ['Web Development', 'C Programming', 'Mathematics', 'Communication Skills'];
        // const statuses = ['Present', 'Absent']; 

        // 2. Generate records for each student
        for (const student of students) {
            // Randomly decide between 25 and 30 records
            const recordCount = Math.floor(Math.random() * (30 - 25 + 1)) + 25;
            console.log(`Generating ${recordCount} records for ${student.name} (${student.enrollmentNo})...`);

            for (let i = 0; i < recordCount; i++) {
                // Go back 'i' days from today
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0]; // "2024-10-05"

                // 80% chance of being Present
                const isPresent = Math.random() < 0.8;
                const status = isPresent ? 'Present' : 'Absent';

                // Random subject
                const subject = subjects[Math.floor(Math.random() * subjects.length)];

                attendanceRecords.push({
                    studentId: student._id.toString(),
                    studentName: student.name,
                    date: dateStr,
                    status: status,
                    subject: subject,
                    startTime: '10:00 AM',
                    endTime: '11:00 AM',
                    college: student.college,
                    course: student.course,
                    semester: student.semester,
                    class: student.class,
                    recordedBy: 'System Seed'
                });
            }
        }

        // 3. Insert into DB
        if (attendanceRecords.length > 0) {
            console.log(`Inserting ${attendanceRecords.length} records...`);
            await Attendance.insertMany(attendanceRecords);
            console.log("Success! Attendance records added.");
        } else {
            console.log("No records generated.");
        }

    } catch (error) {
        console.error("Error seeding attendance:", error);
    } finally {
        // Close connection
        await mongoose.disconnect();
        process.exit();
    }
}

seedAttendance();
