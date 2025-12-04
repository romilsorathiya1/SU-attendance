import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Attendance, Student, Organization } from '@/models/Schemas';

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const college = searchParams.get('college');
  const course = searchParams.get('course');
  const semester = searchParams.get('semester'); 
  const cls = searchParams.get('class'); 
  const subject = searchParams.get('subject'); // <--- NEW PARAMETER
  const view = searchParams.get('view');
  
  if (view === 'students') {
    const students = await Student.find({ college, course, semester, class: cls });
    return NextResponse.json(students);
  }
  
  if (view === 'records') {
    // 1. Get all students in this class
    const students = await Student.find({ college, course, semester, class: cls });
    
    // 2. Calculate percentage for each student, optionally filtered by subject
    const stats = await Promise.all(students.map(async (stu) => {
      // Base query for counting attendance records
      let query = { studentId: stu.enrollmentNo };
      
      // If a specific subject is requested, filter by it
      if (subject) {
        query.subject = subject;
      }

      const total = await Attendance.countDocuments(query);
      const present = await Attendance.countDocuments({ ...query, status: 'Present' });
      
      const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
      
      return {
        ...stu.toObject(),
        attendancePercentage: percentage
      };
    }));
    
    return NextResponse.json(stats);
  }

  if (searchParams.get('hierarchy')) {
    const colleges = await Organization.find({ type: 'college' });
    const courses = await Organization.find({ type: 'course' });
    const classes = await Organization.find({ type: 'class' });
    return NextResponse.json({ colleges, courses, classes });
  }

  return NextResponse.json([]);
}

export async function POST(req) {
  await dbConnect();
  const { attendanceData, meta } = await req.json();

  const existingRecord = await Attendance.findOne({
    class: meta.cls,
    course: meta.course,
    semester: meta.semester,
    college: meta.college,
    date: meta.date,
    startTime: meta.startTime
  });

  if (existingRecord) {
    return NextResponse.json(
      { error: `Attendance for ${meta.cls} (Sem: ${meta.semester}) at ${meta.startTime} has already been taken by ${existingRecord.recordedBy || 'another teacher'}.` }, 
      { status: 409 }
    );
  }

  const records = Object.entries(attendanceData).map(([id, status]) => ({
    studentId: id,
    studentName: meta.students.find(s => s.enrollmentNo === id)?.name,
    date: meta.date,
    status: status === 'P' ? 'Present' : 'Absent',
    subject: meta.subject,
    startTime: meta.startTime,
    endTime: meta.endTime,
    college: meta.college,
    course: meta.course,
    semester: meta.semester, 
    class: meta.cls,
    recordedBy: meta.recordedBy
  }));

  try {
    await Attendance.insertMany(records);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Database Error" }, { status: 500 });
  }
}