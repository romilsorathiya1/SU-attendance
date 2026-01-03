import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Organization, Student, User, Attendance } from '@/models/Schemas';

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (type === 'stats') {
      const students = await Student.countDocuments();
      const teachers = await User.countDocuments({ role: 'Teacher' });
      const colleges = await Organization.countDocuments({ type: 'college' });
      const courses = await Organization.countDocuments({ type: 'course' });
      const studentData = await Student.find({}, 'year'); // For chart
      return NextResponse.json({ students, teachers, colleges, courses, studentData });
    }
    
    if (type === 'all') {
      // Fetch everything for Admin Panel
      const students = await Student.find({});
      const teachers = await User.find({ role: 'Teacher' });
      const colleges = await Organization.find({ type: 'college' });
      const courses = await Organization.find({ type: 'course' });
      const classes = await Organization.find({ type: 'class' });
      const attendance = await Attendance.find({}).sort({ date: -1 }).limit(100);
      
      return NextResponse.json({ students, teachers, colleges, courses, classes, attendance });
    }

    return NextResponse.json({ message: 'Specify type' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}