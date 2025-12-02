import mongoose from 'mongoose';

// 1. User Schema (Teachers/Admins)
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, 
  role: { type: String, enum: ['Admin', 'Teacher'], default: 'Teacher' },
  college: String,
  resetPasswordOtp: { type: String },
  resetPasswordExpire: { type: Date },
});

// 2. Student Schema
const StudentSchema = new mongoose.Schema({
  enrollmentNo: { type: String, unique: true, required: true },
  name: String,
  email: { type: String, required: true }, 
  mobile: String,
  password: { type: String, required: true },
  
  college: String,
  course: String,
  semester: String, // <--- CHANGED FROM YEAR TO SEMESTER
  class: String,

  resetPasswordOtp: { type: String },
  resetPasswordExpire: { type: Date },
});

// 3. Attendance Schema
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
  semester: String, // <--- CHANGED FROM YEAR TO SEMESTER
  class: String,
  recordedBy: String, 
});

// 4. Organization Schema
const OrganizationSchema = new mongoose.Schema({
  type: { type: String, enum: ['college', 'course', 'class'] },
  name: String,
  parentId: String, 
  parentName: String,
  details: Object // For classes, this will now store { semester: 'Semester 1' }
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
export const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);