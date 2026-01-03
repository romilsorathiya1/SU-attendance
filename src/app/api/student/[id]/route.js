import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Student, Attendance, Organization } from '@/models/Schemas';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET(req, { params }) {
  await dbConnect();
  const { id } = await params; // Next.js 15 requires awaiting params
  
  const cookieStorage = await cookies();
  const token = cookieStorage.get("token")?.value;

  // const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123');
  // const { payload } = await jwtVerify(token, secret);
  // const cookieId=payload._id

  // 1. Fetch Student
  const student = await Student.findOne({ _id: id });
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

//   if(student._id.toString() !== cookieId) {
//   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// }


  // 2. Fetch Attendance Records
  const records = await Attendance.find({ studentId: student.enrollmentNo }).sort({ date: -1 });

  // 3. Fetch Subjects based on Student's Course and Semester
  let subjects = [];
  try {
    const courseOrg = await Organization.findOne({ type: 'course', name: student.course });
    
    if (courseOrg && courseOrg.details && courseOrg.details.subjects) {
      const allSubjects = courseOrg.details.subjects;

      if (Array.isArray(allSubjects)) {
        // Legacy support: if subjects are just a flat array
        subjects = allSubjects;
      } else {
        // New Semester-wise structure: { "Semester 1": [...], "Semester 2": [...] }
        // We use student.semester (e.g., "Semester 1") to pick the right list
        subjects = allSubjects[student.semester] || [];
      }
    }
  } catch (error) {
    console.error("Error fetching subjects:", error);
  }

  return NextResponse.json({ student, records, subjects });
}